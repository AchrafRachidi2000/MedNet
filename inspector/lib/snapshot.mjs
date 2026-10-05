import { buildCatalog } from "./catalog.mjs";
import { buildLayout } from "./layout.mjs";
import { buildBusinessCatalog } from "./business.mjs";
import { buildPhaseLayouts, omitScenarioHarness } from "./phases.mjs";
import { addNodeDetails } from "./node-details.mjs";

// The same credential-scrubbed presentation model is used locally and hosted.
// Never return the original workflow or configuration defaults.
export async function buildSnapshot(raw, { hosted = false } = {}) {
  const source = buildCatalog(raw);
  const businessCatalog = buildBusinessCatalog(source);
  addNodeDetails(source, businessCatalog);
  const catalog = omitScenarioHarness(source);
  const visible = new Set(catalog.nodes.map((node) => node.id));
  for (const node of businessCatalog.nodes)
    node.technicalNodeIds = node.technicalNodeIds.filter((id) =>
      visible.has(id),
    );
  catalog.hosted = hosted;
  catalog.sourceDocumentsAvailable = !hosted;
  businessCatalog.hosted = hosted;
  businessCatalog.sourceDocumentsAvailable = !hosted;
  if (hosted)
    catalog.privacy =
      "Credential-scrubbed configuration snapshot. Original source documents are not deployed. No production services are called.";
  return {
    catalog,
    layout: {
      control: await buildLayout(catalog),
      data: await buildLayout(catalog, "data"),
      phases: await buildPhaseLayouts(catalog, true),
    },
    business: {
      catalog: businessCatalog,
      layout: await buildLayout(businessCatalog),
      phases: await buildPhaseLayouts(businessCatalog),
    },
  };
}
