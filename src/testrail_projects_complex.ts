import { z } from "zod";
import { FastMCP } from "./FastMCP.js";

const testrailEnvSchema = z.object({
  TESTRAIL_URL: z.string().url("A valid TestRail URL is required."),
  TESTRAIL_USER: z.string().email("A valid TestRail user email is required."),
  TESTRAIL_API_KEY: z.string().min(1, "A TestRail API key is required."),
});

const env = testrailEnvSchema.parse(process.env);

export function addTestRailProjectToolsComplex(server: FastMCP) {

  const ProjectOperations = z.object({
    operation: z.enum(['get_project', 'get_projects', 'add_project', 'update_project', 'delete_project']),
    project_id: z.number().int().positive().optional(),
    name: z.string().min(1).optional(),
    announcement: z.string().optional(),
    show_announcement: z.boolean().optional(),
    suite_mode: z.number().int().min(1).max(3).optional(),
    is_completed: z.boolean().optional(),
    limit: z.number().int().positive().optional(),
    offset: z.number().int().nonnegative().optional(),
}).superRefine((val, ctx) => {
    switch (val.operation) {
        case 'get_project':
        case 'update_project':
        case 'delete_project':
            if (!val.project_id) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'project_id is required',
                    path: ['project_id']
                });
            }
            break;
        case 'add_project':
            if (!val.name) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'name is required',
                    path: ['name']
                });
            }
            break;
    }
});

  server.addTool({
    name: "manage_testrail_projects",
    description: "Manages TestRail projects. Operations: get_project, get_projects, add_project, update_project, delete_project.",
    parameters: ProjectOperations,
    execute: async (args) => {
        const authHeader = `Basic ${Buffer.from(`${env.TESTRAIL_USER}:${env.TESTRAIL_API_KEY}`).toString("base64")}`;
        const baseUrl = `${env.TESTRAIL_URL}/index.php?/api/v2`;
        let url = '';
        let method = 'GET';
        let body: any = undefined;

        switch (args.operation) {
            case 'get_project':
                url = `${baseUrl}/get_project/${args.project_id}`;
                break;
            case 'get_projects':
                const params = new URLSearchParams();
                if (args.is_completed !== undefined) params.append('is_completed', args.is_completed ? '1' : '0');
                if (args.limit !== undefined) params.append('limit', args.limit.toString());
                if (args.offset !== undefined) params.append('offset', args.offset.toString());
                url = `${baseUrl}/get_projects&${params.toString()}`;
                break;
            case 'add_project':
                url = `${baseUrl}/add_project`;
                method = 'POST';
                body = { ...args };
                delete body.operation;
                break;
            case 'update_project':
                url = `${baseUrl}/update_project/${args.project_id}`;
                method = 'POST';
                body = { ...args };
                delete body.operation;
                delete body.project_id;
                break;
            case 'delete_project':
                url = `${baseUrl}/delete_project/${args.project_id}`;
                method = 'POST';
                break;
        }

        try {
            const response = await fetch(url, {
              method,
              headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
              body: body ? JSON.stringify(body) : undefined,
            });
    
            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`TestRail API Error: ${response.status} ${response.statusText} - ${errorText}`);
            }
            
            if (response.status === 204 || args.operation.startsWith('delete')) {
                return `Operation ${args.operation} successful.`;
            }

            const data = await response.json();
            return JSON.stringify(data, null, 2);

          } catch (error) {
            return `Failed to perform operation ${args.operation}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
          }
    },
  });
}
