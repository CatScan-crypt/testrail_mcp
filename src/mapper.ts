import { FastMCP } from "./FastMCP.js";
import { addTestRailTools } from "./testrail_cases.js";
import { addTestRailProjectTools } from "./testrail_projects.js";
import { addTestRailSuiteTools } from "./testrail_suites.js";
import { addTestRailSectionTools } from "./testrail_sections.js";

// 1. Create the server instance
const server = new FastMCP({
  name: "TestRail Mapped Server",
  version: "1.0.0",
});

// 2. Add the tools by calling the exported function
addTestRailTools(server);
addTestRailProjectTools(server);
addTestRailSuiteTools(server);
addTestRailSectionTools(server);

// 3. Start the server
server.start({ transportType: "stdio" });

console.log("Started TestRail Mapped MCP server via stdio.");
