import { z } from "zod";
import { FastMCP } from "./FastMCP.js";

const testrailEnvSchema = z.object({
  TESTRAIL_URL: z.string().url("A valid TestRail URL is required."),
  TESTRAIL_USER: z.string().email("A valid TestRail user email is required."),
  TESTRAIL_API_KEY: z.string().min(1, "A TestRail API key is required."),
});

const env = testrailEnvSchema.parse(process.env);

export function addTestRailSectionTools(server: FastMCP) {
  // --- get_section ---
  const GetSectionParams = z.object({
    section_id: z.number().int().positive("The ID of the section"),
  });

  server.addTool({
    name: "get_section",
    description: "Returns an existing section.",
    parameters: GetSectionParams,
    annotations: {
      openWorldHint: true,
      readOnlyHint: true,
    },
    execute: async (args) => {
      const { section_id } = args;
      const url = `${env.TESTRAIL_URL}/index.php?/api/v2/get_section/${section_id}`;
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
        return `Failed to fetch section ${section_id}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
  });

  // --- get_sections ---
  const GetSectionsParams = z.object({
    project_id: z.number().int().positive("The ID of the project"),
    suite_id: z.number().int().positive().optional().describe("The ID of the test suite (optional if the project is operating in single suite mode)"),
    limit: z.number().int().positive().optional().describe("The number of sections the response should return"),
    offset: z.number().int().nonnegative().optional().describe("Where to start counting the sections from"),
  });

  server.addTool({
    name: "get_sections",
    description: "Returns a list of sections for a project and test suite.",
    parameters: GetSectionsParams,
    annotations: {
      openWorldHint: true,
      readOnlyHint: true,
    },
    execute: async (args) => {
        const { project_id, suite_id, ...queryParams } = args;
        let urlString = `${env.TESTRAIL_URL}/index.php?/api/v2/get_sections/${project_id}`;
        if (suite_id) {
            urlString += `&suite_id=${suite_id}`;
        }

        const query = [];
        for (const [key, value] of Object.entries(queryParams)) {
            if (value !== undefined) {
                query.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
            }
        }

        if (query.length > 0) {
            urlString += '&' + query.join('&');
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
        return `Failed to fetch sections for project ${args.project_id}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
  });

  // --- add_section ---
  const AddSectionParams = z.object({
    project_id: z.number().int().positive("The ID of the project"),
    name: z.string().min(1, "The name of the section is required."),
    description: z.string().optional().describe("The description of the section"),
    suite_id: z.number().int().positive().optional().describe("The ID of the test suite (ignored if the project is operating in single suite mode, required otherwise)"),
    parent_id: z.number().int().positive().optional().describe("The ID of the parent section (to build section hierarchies)"),
  });

  server.addTool({
    name: "add_section",
    description: "Creates a new section.",
    parameters: AddSectionParams,
    annotations: {
      openWorldHint: true,
      readOnlyHint: false,
    },
    execute: async (args) => {
      const { project_id, ...sectionData } = args;
      const url = `${env.TESTRAIL_URL}/index.php?/api/v2/add_section/${project_id}`;
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
          body: JSON.stringify(sectionData)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`TestRail API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        return JSON.stringify(data, null, 2);
      } catch (error) {
        console.error(error);
        return `Failed to add section to project ${project_id}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
  });

  // --- move_section ---
  const MoveSectionParams = z.object({
    section_id: z.number().int().positive("The ID of the section"),
    parent_id: z.number().int().positive().nullable().optional().describe("The ID of the parent section (it can be null if it should be moved to the root)"),
    after_id: z.number().int().positive().nullable().optional().describe("The section ID after which the section should be put (can be null)"),
  });

  server.addTool({
    name: "move_section",
    description: "Moves a section to another suite or section.",
    parameters: MoveSectionParams,
    annotations: {
      openWorldHint: true,
      readOnlyHint: false,
    },
    execute: async (args) => {
        const { section_id, ...moveData } = args;
        const url = `${env.TESTRAIL_URL}/index.php?/api/v2/move_section/${section_id}`;
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
                body: JSON.stringify(moveData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`TestRail API Error: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            return JSON.stringify(data, null, 2);
        } catch (error) {
            console.error(error);
            return `Failed to move section ${section_id}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
    },
  });

  // --- update_section ---
  const UpdateSectionParams = z.object({
    section_id: z.number().int().positive("The ID of the section"),
    name: z.string().optional(),
    description: z.string().optional(),
  });

  server.addTool({
    name: "update_section",
    description: "Updates an existing section.",
    parameters: UpdateSectionParams,
    annotations: {
      openWorldHint: true,
      readOnlyHint: false,
    },
    execute: async (args) => {
      const { section_id, ...updateData } = args;
      const url = `${env.TESTRAIL_URL}/index.php?/api/v2/update_section/${section_id}`;
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
        return `Failed to update section ${section_id}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
  });

  // --- delete_section ---
  const DeleteSectionParams = z.object({
    section_id: z.number().int().positive("The ID of the section"),
    soft: z.number().int().min(0).max(1).optional().describe("If soft=1, this will return data on the number of affected tests, cases, etc, without actually deleting the entity.")
  });

  server.addTool({
    name: "delete_section",
    description: "Deletes an existing section.",
    parameters: DeleteSectionParams,
    annotations: {
      openWorldHint: true,
      readOnlyHint: false,
    },
    execute: async (args) => {
      const { section_id, soft } = args;
      let url = `${env.TESTRAIL_URL}/index.php?/api/v2/delete_section/${section_id}`;
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

        return `Successfully deleted section ${section_id}.`;
      } catch (error) {
        console.error(error);
        return `Failed to delete section ${section_id}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
  });
}
