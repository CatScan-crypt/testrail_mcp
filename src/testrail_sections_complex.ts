import { z } from "zod";
import { FastMCP } from "./FastMCP.js";

const testrailEnvSchema = z.object({
  TESTRAIL_URL: z.string().url("A valid TestRail URL is required."),
  TESTRAIL_USER: z.string().email("A valid TestRail user email is required."),
  TESTRAIL_API_KEY: z.string().min(1, "A TestRail API key is required."),
});

const env = testrailEnvSchema.parse(process.env);

export function addTestRailSectionToolsComplex(server: FastMCP) {

  const SectionOperations = z.object({
    operation: z.enum(['get_section', 'get_sections', 'add_section', 'update_section', 'delete_section', 'move_section']),
    section_id: z.number().int().positive().optional(),
    project_id: z.number().int().positive().optional(),
    suite_id: z.number().int().positive().optional(),
    parent_id: z.number().int().positive().optional(),
    after_id: z.number().int().positive().optional(),
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    soft: z.boolean().optional(),
}).superRefine((val, ctx) => {
    switch (val.operation) {
        case 'get_section':
        case 'update_section':
        case 'delete_section':
        case 'move_section':
            if (!val.section_id) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'section_id is required', path: ['section_id'] });
            break;
        case 'get_sections':
            if (!val.project_id) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'project_id is required', path: ['project_id'] });
            break;
        case 'add_section':
            if (!val.project_id) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'project_id is required', path: ['project_id'] });
            if (!val.name) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'name is required', path: ['name'] });
            break;
    }
});

  server.addTool({
    name: "manage_testrail_sections",
    description: "Manages TestRail sections. Operations: get_section, get_sections, add_section, update_section, delete_section, move_section.",
    parameters: SectionOperations,
    execute: async (args) => {
        const authHeader = `Basic ${Buffer.from(`${env.TESTRAIL_USER}:${env.TESTRAIL_API_KEY}`).toString("base64")}`;
        const baseUrl = `${env.TESTRAIL_URL}/index.php?/api/v2`;
        let url = '';
        let method = 'GET';
        let body: any = undefined;

        switch (args.operation) {
            case 'get_section':
                url = `${baseUrl}/get_section/${args.section_id}`;
                break;
            case 'get_sections':
                const params = new URLSearchParams();
                if (args.suite_id) params.append('suite_id', args.suite_id.toString());
                url = `${baseUrl}/get_sections/${args.project_id}&${params.toString()}`;
                break;
            case 'add_section':
                url = `${baseUrl}/add_section/${args.project_id}`;
                method = 'POST';
                body = { ...args };
                delete body.operation;
                delete body.project_id;
                break;
            case 'update_section':
                url = `${baseUrl}/update_section/${args.section_id}`;
                method = 'POST';
                body = { name: args.name, description: args.description };
                break;
            case 'delete_section':
                url = `${baseUrl}/delete_section/${args.section_id}`;
                method = 'POST';
                body = { soft: args.soft ? 1 : 0 };
                break;
            case 'move_section':
                url = `${baseUrl}/move_section/${args.section_id}`;
                method = 'POST';
                body = { after_id: args.after_id, parent_id: args.parent_id };
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
