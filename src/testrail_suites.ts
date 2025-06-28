import { z } from "zod";
import { FastMCP } from "./FastMCP.js";

const testrailEnvSchema = z.object({
  TESTRAIL_URL: z.string().url("A valid TestRail URL is required."),
  TESTRAIL_USER: z.string().email("A valid TestRail user email is required."),
  TESTRAIL_API_KEY: z.string().min(1, "A TestRail API key is required."),
});

const env = testrailEnvSchema.parse(process.env);

export function addTestRailSuiteTools(server: FastMCP) {
  // --- get_suite ---
  const GetSuiteParams = z.object({
    suite_id: z.number().int().positive("The ID of the test suite"),
  });

  server.addTool({
    name: "get_suite",
    description: "Returns an existing test suite.",
    parameters: GetSuiteParams,
    annotations: {
      openWorldHint: true,
      readOnlyHint: true,
    },
    execute: async (args) => {
      const { suite_id } = args;
      const url = `${env.TESTRAIL_URL}/index.php?/api/v2/get_suite/${suite_id}`;
      const authHeader = `Basic ${Buffer.from(
        `${env.TESTRAIL_USER}:${env.TESTRAIL_API_KEY}`
      ).toString("base64")}`;

      try {
        const response = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`TestRail API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        return JSON.stringify(data, null, 2);
      } catch (error) {
        console.error(error);
        return `Failed to fetch suite ${suite_id}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
  });

  // --- get_suites ---
  const GetSuitesParams = z.object({
    project_id: z.number().int().positive("The ID of the project"),
  });

  server.addTool({
    name: "get_suites",
    description: "Returns a list of test suites for a project.",
    parameters: GetSuitesParams,
    annotations: {
      openWorldHint: true,
      readOnlyHint: true,
    },
    execute: async (args) => {
      const { project_id } = args;
      const url = `${env.TESTRAIL_URL}/index.php?/api/v2/get_suites/${project_id}`;
      const authHeader = `Basic ${Buffer.from(
        `${env.TESTRAIL_USER}:${env.TESTRAIL_API_KEY}`
      ).toString("base64")}`;

      try {
        const response = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`TestRail API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        return JSON.stringify(data, null, 2);
      } catch (error) {
        console.error(error);
        return `Failed to fetch suites for project ${project_id}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
  });

  // --- add_suite ---
  const AddSuiteParams = z.object({
    project_id: z.number().int().positive("The ID of the project the test suite should be added to"),
    name: z.string().min(1, "The name of the test suite is required."),
    description: z.string().optional().describe("The description of the test suite"),
  });

  server.addTool({
    name: "add_suite",
    description: "Creates a new test suite.",
    parameters: AddSuiteParams,
    annotations: {
      openWorldHint: true,
      readOnlyHint: false,
    },
    execute: async (args) => {
      const { project_id, ...suiteData } = args;
      const url = `${env.TESTRAIL_URL}/index.php?/api/v2/add_suite/${project_id}`;
      const authHeader = `Basic ${Buffer.from(
        `${env.TESTRAIL_USER}:${env.TESTRAIL_API_KEY}`
      ).toString("base64")}`;

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
          body: JSON.stringify(suiteData)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`TestRail API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        return JSON.stringify(data, null, 2);
      } catch (error) {
        console.error(error);
        return `Failed to add suite to project ${project_id}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
  });

  // --- update_suite ---
  const UpdateSuiteParams = z.object({
    suite_id: z.number().int().positive("The ID of the test suite"),
    name: z.string().optional(),
    description: z.string().optional(),
  });

  server.addTool({
    name: "update_suite",
    description: "Updates an existing test suite.",
    parameters: UpdateSuiteParams,
    annotations: {
      openWorldHint: true,
      readOnlyHint: false,
    },
    execute: async (args) => {
      const { suite_id, ...updateData } = args;
      const url = `${env.TESTRAIL_URL}/index.php?/api/v2/update_suite/${suite_id}`;
      const authHeader = `Basic ${Buffer.from(
        `${env.TESTRAIL_USER}:${env.TESTRAIL_API_KEY}`
      ).toString("base64")}`;

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
          body: JSON.stringify(updateData)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`TestRail API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        return JSON.stringify(data, null, 2);
      } catch (error) {
        console.error(error);
        return `Failed to update suite ${suite_id}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
  });

  // --- delete_suite ---
  const DeleteSuiteParams = z.object({
    suite_id: z.number().int().positive("The ID of the test suite"),
    soft: z.number().int().min(0).max(1).optional().describe("If soft=1, this will return data on the number of affected tests, cases, etc, without actually deleting the entity.")
  });

  server.addTool({
    name: "delete_suite",
    description: "Deletes an existing test suite.",
    parameters: DeleteSuiteParams,
    annotations: {
      openWorldHint: true,
      readOnlyHint: false,
    },
    execute: async (args) => {
      const { suite_id, soft } = args;
      let url = `${env.TESTRAIL_URL}/index.php?/api/v2/delete_suite/${suite_id}`;
      if(soft) {
        url += `&soft=${soft}`
      }
      const authHeader = `Basic ${Buffer.from(
        `${env.TESTRAIL_USER}:${env.TESTRAIL_API_KEY}`
      ).toString("base64")}`;

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`TestRail API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        return `Successfully deleted suite ${suite_id}.`;
      } catch (error) {
        console.error(error);
        return `Failed to delete suite ${suite_id}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
  });
}
