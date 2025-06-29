import { z } from "zod";
import { FastMCP } from "./FastMCP.js";

const testrailEnvSchema = z.object({
  TESTRAIL_URL: z.string().url("A valid TestRail URL is required."),
  TESTRAIL_USER: z.string().email("A valid TestRail user email is required."),
  TESTRAIL_API_KEY: z.string().min(1, "A TestRail API key is required."),
});

const env = testrailEnvSchema.parse(process.env);

export function addTestRailSuiteToolsComplex(server: FastMCP) {
  const SuiteOperations = z.object({
    operation: z.enum(['get', 'list', 'add', 'update', 'delete']),
    suite_id: z.number().int().positive().optional(),
    project_id: z.number().int().positive().optional(),
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    soft: z.number().int().min(0).max(1).optional(),
}).superRefine((val, ctx) => {
    switch (val.operation) {
        case 'get':
        case 'delete':
        case 'update':
            if (val.suite_id === undefined) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `suite_id is required when operation is '${val.operation}'`,
                    path: ['suite_id'],
                });
            }
            break;
        case 'list':
            if (val.project_id === undefined) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "project_id is required when operation is 'list'",
                    path: ['project_id'],
                });
            }
            break;
        case 'add':
            if (val.project_id === undefined) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "project_id is required when operation is 'add'",
                    path: ['project_id'],
                });
            }
            if (val.name === undefined) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "name is required when operation is 'add'",
                    path: ['name'],
                });
            }
            break;
    }
});

  server.addTool({
    name: "manage_testrail_suites",
    description: "Manages TestRail suites. Operations: get, list, add, update, delete.",
    parameters: SuiteOperations,
    annotations: {
      openWorldHint: true,
    },
    execute: async (args) => {
        const authHeader = `Basic ${Buffer.from(
            `${env.TESTRAIL_USER}:${env.TESTRAIL_API_KEY}`
          ).toString("base64")}`;

        const baseUrl = `${env.TESTRAIL_URL}/index.php?/api/v2`;
        let url = '';
        let method = 'GET';
        let body: string | undefined = undefined;

        switch (args.operation) {
            case 'get':
                url = `${baseUrl}/get_suite/${args.suite_id}`;
                break;
            case 'list':
                url = `${baseUrl}/get_suites/${args.project_id}`;
                break;
            case 'add':
                url = `${baseUrl}/add_suite/${args.project_id}`;
                method = 'POST';
                const addData: { name: string; description?: string } = { name: args.name! };
                if (args.description) {
                    addData.description = args.description;
                }
                body = JSON.stringify(addData);
                break;
            case 'update':
                url = `${baseUrl}/update_suite/${args.suite_id}`;
                method = 'POST';
                const updateData: { name?: string; description?: string } = {};
                if (args.name) {
                    updateData.name = args.name;
                }
                if (args.description) {
                    updateData.description = args.description;
                }
                body = JSON.stringify(updateData);
                break;
            case 'delete':
                url = `${baseUrl}/delete_suite/${args.suite_id}`;
                method = 'POST';
                if (args.soft) {
                    url += `&soft=${args.soft}`;
                }
                break;
        }

        try {
            const response = await fetch(url, {
              method,
              headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
              },
              body,
            });
    
            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`TestRail API Error: ${response.status} ${response.statusText} - ${errorText}`);
            }
            
            if (args.operation === 'delete') {
                return `Successfully deleted suite ${args.suite_id}.`;
            }

            const data = await response.json();
            return JSON.stringify(data, null, 2);

          } catch (error) {
            console.error(error);
            return `Failed to perform operation ${args.operation}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
          }
    },
  });
}
