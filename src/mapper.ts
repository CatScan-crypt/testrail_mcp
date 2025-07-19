import { FastMCP } from "./FastMCP.js";
import { addTestRailSuiteToolsComplex } from "./testrail_suites_complex.js";
import { addTestRailCasesToolsComplex } from "./testrail_cases_complex.js";
import { addTestRailSectionToolsComplex } from "./testrail_sections_complex.js";
import { addTestRailProjectToolsComplex } from "./testrail_projects_complex.js";

// 1. Create the server instance
const server = new FastMCP({
  name: "TestRail Mapped Server",
  version: "1.0.0",
});

// 2. Add the tools by calling the exported function
addTestRailSuiteToolsComplex(server)
addTestRailCasesToolsComplex(server);
addTestRailSectionToolsComplex(server);
addTestRailProjectToolsComplex(server);

// 3. Start the server
server.start({ transportType: "stdio" });

console.log("Started TestRail Mapped MCP server via stdio.");
