import { FastMCP } from "./FastMCP.js";
// import { addTestRailTools } from "./testrail_cases.js";
import { addTestRailProjectTools } from "./testrail_projects.js";
import { addTestRailSuiteToolsComplex } from "./testrail_suites_complex.js";
import { addTestRailCasesToolsComplex } from "./testrail_cases_complex.js";
import { addTestRailSectionToolsComplex } from "./testrail_sections_complex.js";

// 1. Create the server instance
const server = new FastMCP({
  name: "TestRail Mapped Server",
  version: "1.0.0",
});

// 2. Add the tools by calling the exported function
addTestRailProjectTools(server);
addTestRailSuiteToolsComplex(server)
addTestRailCasesToolsComplex(server);
addTestRailSectionToolsComplex(server);

// 3. Start the server
server.start({ transportType: "stdio" });

console.log("Started TestRail Mapped MCP server via stdio.");
