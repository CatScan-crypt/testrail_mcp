import { z } from "zod";
import { FastMCP } from "./FastMCP.js";

const testrailEnvSchema = z.object({
  TESTRAIL_URL: z.string().url("A valid TestRail URL is required."),
  TESTRAIL_USER: z.string().email("A valid TestRail user email is required."),
  TESTRAIL_API_KEY: z.string().min(1, "A TestRail API key is required."),
});

const env = testrailEnvSchema.parse(process.env);

export function addTestRailProjectTools(server: FastMCP) {
  // --- get_project ---
  const GetProjectParams = z.object({
    project_id: z.number().int().positive("The ID of the project"),
  });

  server.addTool({
    name: "get_project",
    description: "Returns an existing project.",
    parameters: GetProjectParams,
    annotations: {
      openWorldHint: true,
      readOnlyHint: true,
    },
    execute: async (args) => {
      const { project_id } = args;
      const url = `${env.TESTRAIL_URL}/index.php?/api/v2/get_project/${project_id}`;
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
        return `Failed to fetch project ${project_id}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
  });

  // --- get_projects ---
  const GetProjectsParams = z.object({
    is_completed: z.number().int().optional().describe("1 to return completed projects only. 0 to return active projects only"),
    limit: z.number().int().positive().optional().describe("The number of projects the response should return"),
    offset: z.number().int().nonnegative().optional().describe("Where to start counting the projects from"),
  });

  server.addTool({
    name: "get_projects",
    description: "Returns the list of available projects.",
    parameters: GetProjectsParams,
    annotations: {
      openWorldHint: true,
      readOnlyHint: true,
    },
    execute: async (args) => {
      let urlString = `${env.TESTRAIL_URL}/index.php?/api/v2/get_projects`;
      const queryParams = [];
      for (const [key, value] of Object.entries(args)) {
        if (value !== undefined) {
          queryParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
        }
      }

      if (queryParams.length > 0) {
        urlString += '&' + queryParams.join('&');
      }

      const authHeader = `Basic ${Buffer.from(
        `${env.TESTRAIL_USER}:${env.TESTRAIL_API_KEY}`
      ).toString("base64")}`;

      try {
        const response = await fetch(urlString, {
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
        return `Failed to fetch projects. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
  });

  // --- add_project ---
  const AddProjectParams = z.object({
    name: z.string().min(1, "The name of the project is required."),
    announcement: z.string().optional().describe("The description/announcement of the project"),
    show_announcement: z.boolean().optional().describe("True if the announcement should be displayed on the project’s overview page and false otherwise"),
    suite_mode: z.number().int().min(1).max(3).optional().describe("The suite mode of the project (1 for single suite mode, 2 for single suite + baselines, 3 for multiple suites)"),
  });

  server.addTool({
    name: "add_project",
    description: "Creates a new project (admin status required).",
    parameters: AddProjectParams,
    annotations: {
      openWorldHint: true,
      readOnlyHint: false,
    },
    execute: async (args) => {
      const url = `${env.TESTRAIL_URL}/index.php?/api/v2/add_project`;
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
          body: JSON.stringify(args)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`TestRail API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        return JSON.stringify(data, null, 2);
      } catch (error) {
        console.error(error);
        return `Failed to add project. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
  });

  // --- update_project ---
  const UpdateProjectParams = z.object({
    project_id: z.number().int().positive("The ID of the project"),
    name: z.string().optional(),
    announcement: z.string().optional(),
    show_announcement: z.boolean().optional(),
    suite_mode: z.number().int().min(1).max(3).optional(),
    is_completed: z.boolean().optional(),
  });

  server.addTool({
    name: "update_project",
    description: "Updates an existing project (admin status required; partial updates are supported).",
    parameters: UpdateProjectParams,
    annotations: {
      openWorldHint: true,
      readOnlyHint: false,
    },
    execute: async (args) => {
      const { project_id, ...updateData } = args;
      const url = `${env.TESTRAIL_URL}/index.php?/api/v2/update_project/${project_id}`;
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
        return `Failed to update project ${project_id}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
  });

  // --- delete_project ---
  const DeleteProjectParams = z.object({
    project_id: z.number().int().positive("The ID of the project"),
  });

  server.addTool({
    name: "delete_project",
    description: "Deletes an existing project (admin status required). This action cannot be undone.",
    parameters: DeleteProjectParams,
    annotations: {
      openWorldHint: true,
      readOnlyHint: false,
    },
    execute: async (args) => {
      const { project_id } = args;
      const url = `${env.TESTRAIL_URL}/index.php?/api/v2/delete_project/${project_id}`;
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

        return `Successfully deleted project ${project_id}.`;
      } catch (error) {
        console.error(error);
        return `Failed to delete project ${project_id}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
  });
}
