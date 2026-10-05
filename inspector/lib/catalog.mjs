import { createHash } from "node:crypto";
import { annotation, stages, findings, glossary } from "./annotations.mjs";

const sensitive =
  /secret|password|access.?token|refresh.?token|authorization|api.?key|client.?id/i;
const safeConfig =
  /^(doc_matrix_json|pic_reference_json|allowed_codes|required_products|use_sync|api_path|audit_path|provider_network)$/;
export function buildCatalog(raw) {
  const workflow = JSON.parse(raw),
    originalById = new Map(workflow.nodes.map((n) => [n.id, n]));
  const secretValues = new Set();
  function collectStrings(v) {
    if (typeof v === "string" && v.length >= 6) secretValues.add(v);
    else if (v && typeof v === "object")
      for (const [k, x] of Object.entries(v))
        if (k !== "type") collectStrings(x);
  }
  for (const n of workflow.nodes)
    for (const direction of ["input", "output"]) {
      const schema = n.data[direction + "_schema"]?.schema || {};
      for (const [key, f] of Object.entries(schema))
        if (sensitive.test(key + " " + f.display_name)) {
          collectStrings(f.default);
          collectStrings(
            n.data.set_values?.[direction + "_set_values"]?.[key]?.value,
          );
        }
    }
  function scrubText(text) {
    let value = text;
    for (const secret of secretValues)
      value = value.split(secret).join("[REDACTED CREDENTIAL]");
    return value.replace(
      /(\b(?:client_secret|password|api_key|access_token)\b["']?\s*[:=]\s*)["']([^"'\r\n]{8,})["']/gi,
      (full, prefix, body) =>
        /inputs|workflow_|placeholder|your_|os\.|env\.|get\(|claim|token|secret/i.test(
          body,
        )
          ? full
          : prefix + '"[REDACTED CREDENTIAL]"',
    );
  }
  function scrub(value) {
    if (typeof value === "string") return scrubText(value);
    if (Array.isArray(value)) return value.map(scrub);
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value)
          .filter(([key]) => !["icon", "default"].includes(key))
          .map(([key, v]) => [key, scrub(v)]),
      );
    return value;
  }
  function fields(schema, prefix = "", depth = 0) {
    const output = [];
    for (const [key, f] of Object.entries(schema || {})) {
      const path = prefix ? `${prefix}.${key}` : key;
      const types = f.allowed_types || [];
      const item = {
        key,
        path,
        name: f.display_name || f.variable_name || key,
        description: scrubText(f.description || ""),
        nullable: f.is_nullable ?? null,
        types: types.map((t) => t.type),
        depth,
        children: [],
        hasDefault: f.default !== null && f.default !== undefined,
        definitionEnforced: types.map((t) => ({
          type: t.type,
          enforced: t.type_definition_enforced ?? null,
        })),
        schema: scrub(f),
      };
      for (const t of types) {
        const def = t.type_definition;
        if (!def || typeof def !== "object") continue;
        if (t.type === "array" && def.allowed_types) {
          for (const sub of def.allowed_types || [])
            if (sub.type_definition && sub.type === "object")
              item.children.push(
                ...fields(sub.type_definition, path + "[]", depth + 1),
              );
        } else if (!Array.isArray(def) && !def.allowed_types)
          item.children.push(...fields(def, path, depth + 1));
      }
      output.push(item);
    }
    return output;
  }
  const nodes = workflow.nodes.map((n, index) => {
    const d = n.data,
      a = annotation(d.name);
    const configuration = [];
    for (const direction of ["input", "output"])
      for (const [key, entry] of Object.entries(
        d.set_values?.[direction + "_set_values"] || {},
      )) {
        const f = d[direction + "_schema"]?.schema?.[key],
          name = f?.display_name || key;
        const permitted =
          !sensitive.test(key + " " + name) &&
          (safeConfig.test(key) ||
            /eop catalog|pic reference|doc matrix/i.test(name));
        configuration.push({
          direction,
          key,
          name,
          withheld: !permitted,
          value: permitted ? scrub(entry.value) : null,
          reason: permitted
            ? "Reference or non-sensitive control value"
            : "Value withheld: credentials or unreviewed sample/configuration data",
        });
      }
    const process = scrub(d.process || {});
    const code = process.code || "";
    const symbols = code
      .split("\n")
      .flatMap((line, i) =>
        /^\s*(?:def |class )/.test(line)
          ? [{ line: i + 1, text: line.trim() }]
          : [],
      );
    return {
      id: n.id,
      index,
      name: d.name,
      type: n.type,
      role:
        n.type === "agent"
          ? "AI agent"
          : n.type === "human"
            ? "Human review"
            : n.type === "sub_workflow"
              ? "Sub-workflow"
              : n.type === "integration"
                ? "OCR integration"
                : n.type === "input"
                  ? "Workflow input"
                  : n.type === "output"
                    ? "Workflow output"
                    : /^API-|^C-00|^C-06/.test(d.name)
                      ? "System call"
                      : /^LOG-/.test(d.name)
                        ? "Audit event"
                        : /^EXIT-/.test(d.name)
                          ? "Checkpoint / exit"
                          : /^T-|^C-16|^C-PROV/.test(d.name)
                            ? "Reconcile & verify"
                            : "Rules & transformation",
      ...a,
      // Technical labels are source evidence, not editorial replacements.
      // Keep the plain-English alias for explanations and existing searches.
      title: d.name,
      explanatoryTitle: a?.title || d.name,
      description: scrubText(d.description || ""),
      inputs: fields(d.input_schema?.schema),
      outputs: fields(d.output_schema?.schema),
      process,
      redacted: JSON.stringify(process).includes("[REDACTED CREDENTIAL]"),
      symbols,
      routes: scrub(d.routes || {}),
      settings: scrub(d.public_execution_settings || {}),
      configuration,
      mappings: scrub(d.mappings || {}),
      handlerId: d.handler_id,
      handlerVersion: d.handler_version_id,
      sourcePointer: `nodes[${index}].data`,
      promptVariables: [
        ...new Set(
          (process.user_prompt || "").match(/\{\{\s*[^{}]+\s*\}\}/g) || [],
        ),
      ].map((x) => x.slice(2, -2).trim()),
      missingInternal: n.type === "sub_workflow" && !d.process,
      unannotated: !a,
    };
  });
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const edges = workflow.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: e.type,
    routeId: e.data?.route_id || null,
    complement: !!e.data?.route_complement,
    label: e.data?.route_id
      ? (originalById.get(e.source)?.data.routes?.[e.data.route_id]?.name ||
          e.data.route_id) + (e.data.route_complement ? " = false" : " = true")
      : "Continue",
    sourcePointer: `edges[${workflow.edges.indexOf(e)}]`,
  }));
  const mappings = [],
    issues = [];
  for (const n of nodes) {
    function visit(key, m, kind = "primary") {
      if (!m) return;
      const source = byId.get(m.origin_id),
        root = (m.variable_path || "").split(/[.\[]/)[0];
      const targetDirection = n.inputs.some((f) => f.key === key)
        ? "inputs"
        : n.outputs.some((f) => f.key === key)
          ? "outputs"
          : "unknown";
      const declared = targetDirection !== "unknown",
        sourceField = (
          m.origin === "input" ? source?.inputs : source?.outputs
        )?.find((f) => f.key === root);
      const map = {
        id: `m${mappings.length}`,
        target: n.id,
        input: key,
        targetDirection,
        source: m.origin_id,
        origin: m.origin,
        path: m.variable_path,
        kind,
        declared,
        sourceDeclared: !!sourceField,
        sourceLabel: sourceField?.name || m.variable_path,
      };
      mappings.push(map);
      if (!declared)
        issues.push({
          id: map.id + "-target",
          level: "review",
          node: n.id,
          title: "Mapping targets an undeclared field",
          detail: `${key} has a configured mapping but is absent from this node’s declared input and output schemas. It may be a stale alias; verify platform behavior.`,
          pointer: n.sourcePointer + ".mappings." + key,
        });
      if (source && m.origin === "output" && !sourceField)
        issues.push({
          id: map.id + "-source",
          level: "review",
          node: n.id,
          title: "Mapping source is not declared",
          detail: `${source.name} does not declare output ${m.variable_path}. This is a static consistency finding, not proof of a runtime failure.`,
          pointer: n.sourcePointer + ".mappings." + key,
        });
      if (!source)
        issues.push({
          id: map.id + "-missing",
          level: "review",
          node: n.id,
          title: "Mapping source node missing",
          detail: m.origin_id,
          pointer: n.sourcePointer + ".mappings." + key,
        });
      for (const alt of Object.values(m.alternative_mappings || {}))
        visit(key, alt, "alternative");
    }
    for (const [key, m] of Object.entries(n.mappings)) visit(key, m);
  }
  const flatten = (list) => list.flatMap((f) => [f, ...flatten(f.children)]);
  const allFields = nodes.flatMap((n) =>
    ["inputs", "outputs"].flatMap((direction) =>
      flatten(n[direction]).map((f) => ({
        ...f,
        nodeId: n.id,
        nodeName: n.name,
        direction,
        children: undefined,
        schema: undefined,
      })),
    ),
  );
  // Kahn ordering uses the supplied control edges, not node labels or diagram coordinates.
  const degree = new Map(nodes.map((n) => [n.id, 0]));
  edges.forEach((e) => degree.set(e.target, (degree.get(e.target) || 0) + 1));
  const queue = nodes.filter((n) => degree.get(n.id) === 0).map((n) => n.id),
    order = [];
  while (queue.length) {
    const id = queue.shift();
    order.push(id);
    for (const e of edges.filter((e) => e.source === id)) {
      degree.set(e.target, degree.get(e.target) - 1);
      if (degree.get(e.target) === 0) queue.push(e.target);
    }
  }
  nodes.forEach((n) => {
    n.order = order.indexOf(n.id);
    n.searchText = [
      n.name,
      n.role,
      n.title,
      n.explanatoryTitle,
      n.summary,
      n.description,
      JSON.stringify(n.inputs),
      JSON.stringify(n.outputs),
      JSON.stringify(n.process),
      JSON.stringify(n.routes),
      JSON.stringify(n.configuration),
    ]
      .join(" ")
      .toLowerCase();
  });
  return {
    version: 1,
    sourceHash: createHash("sha256").update(raw).digest("hex"),
    generatedAt: new Date().toISOString(),
    sourceName: "mednetstructure.json",
    stages,
    nodes,
    edges,
    mappings,
    allFields,
    issues,
    findings,
    glossary,
    stats: {
      nodes: nodes.length,
      edges: edges.length,
      agents: nodes.filter((n) => n.type === "agent").length,
      inputs: nodes.reduce((s, n) => s + n.inputs.length, 0),
      outputs: nodes.reduce((s, n) => s + n.outputs.length, 0),
      nestedFields: allFields.length,
      mappings: mappings.length,
      subworkflowCalls: nodes.filter((n) => n.missingInternal).length,
      missingWorkflows: new Set(
        nodes.filter((n) => n.missingInternal).map((n) => n.handlerId),
      ).size,
      acyclic: order.length === nodes.length,
    },
    privacy:
      "Local confidential source viewer. Credentials and default/sample configuration values are withheld. Prompts and code may still contain internal case examples. Not suitable for public hosting.",
  };
}
