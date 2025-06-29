import { z } from "zod";
import { FastMCP } from "./FastMCP.js";

const testrailEnvSchema = z.object({
  TESTRAIL_URL: z.string().url("A valid TestRail URL is required."),
  TESTRAIL_USER: z.string().email("A valid TestRail user email is required."),
  TESTRAIL_API_KEY: z.string().min(1, "A TestRail API key is required."),
});

const env = testrailEnvSchema.parse(process.env);

export function addTestRailCasesToolsComplex(server: FastMCP) {

  const CaseOperations = z.object({
    operation: z.enum([
        'get_case', 
        'get_cases', 
        'get_history', 
        'add_case', 
        'update_case', 
        'update_cases', 
        'copy_cases', 
        'move_cases', 
        'delete_case', 
        'delete_cases'
    ]),
    case_id: z.number().int().positive().optional(),
    case_ids: z.array(z.number().int().positive()).min(1).optional(),
    project_id: z.number().int().positive().optional(),
    suite_id: z.number().int().positive().optional(),
    section_id: z.number().int().positive().optional(),
    milestone_id: z.number().int().positive().optional(),
    priority_id: z.number().int().positive().optional(),
    template_id: z.number().int().positive().optional(),
    type_id: z.number().int().positive().optional(),
    title: z.string().min(1).optional(),
    estimate: z.string().optional(),
    refs: z.string().optional(),
    filter: z.string().optional(),
    custom_preconds: z.string().optional(),
    custom_expected: z.string().optional(),
    custom_steps: z.array(z.object({ content: z.string(), expected: z.string() })).optional(),
    limit: z.number().int().positive().optional(),
    offset: z.number().int().nonnegative().optional(),
    soft: z.boolean().optional(),
}).superRefine((val, ctx) => {
    switch (val.operation) {
        case 'get_case':
        case 'get_history':
        case 'delete_case':
        case 'update_case':
            if (!val.case_id) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'case_id is required', path: ['case_id'] });
            break;
        case 'get_cases':
            if (!val.project_id) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'project_id is required', path: ['project_id'] });
            break;
        case 'add_case':
            if (!val.section_id) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'section_id is required', path: ['section_id'] });
            if (!val.title) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'title is required', path: ['title'] });
            break;
        case 'update_cases':
        case 'delete_cases':
            if (!val.suite_id) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'suite_id is required', path: ['suite_id'] });
            if (!val.case_ids) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'case_ids are required', path: ['case_ids'] });
            break;
        case 'copy_cases':
            if (!val.section_id) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'section_id is required', path: ['section_id'] });
            if (!val.case_ids) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'case_ids are required', path: ['case_ids'] });
            break;
        case 'move_cases':
            if (!val.section_id) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'section_id is required', path: ['section_id'] });
            if (!val.suite_id) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'suite_id is required', path: ['suite_id'] });
            if (!val.case_ids) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'case_ids are required', path: ['case_ids'] });
            break;
    }
});

  server.addTool({
    name: "manage_testrail_cases",
    description: "Manages TestRail cases. Operations: get_case, get_cases, get_history, add_case, update_case, update_cases, copy_cases, move_cases, delete_case, delete_cases.",
    parameters: CaseOperations,
    execute: async (args) => {
        const authHeader = `Basic ${Buffer.from(`${env.TESTRAIL_USER}:${env.TESTRAIL_API_KEY}`).toString("base64")}`;
        const baseUrl = `${env.TESTRAIL_URL}/index.php?/api/v2`;
        let url = '';
        let method = 'GET';
        let body: any = undefined;

        switch (args.operation) {
            case 'get_case':
                url = `${baseUrl}/get_case/${args.case_id}`;
                break;
            case 'get_cases':
                const params = new URLSearchParams();
                ['suite_id', 'priority_id', 'limit', 'offset', 'filter'].forEach(p => {
                    if ((args as any)[p] !== undefined) params.append(p, (args as any)[p]);
                });
                url = `${baseUrl}/get_cases/${args.project_id}&${params.toString()}`;
                break;
            case 'get_history':
                url = `${baseUrl}/get_history_for_case/${args.case_id}`;
                break;
            case 'add_case':
                url = `${baseUrl}/add_case/${args.section_id}`;
                method = 'POST';
                body = { ...args };
                delete body.operation;
                delete body.section_id;
                break;
            case 'update_case':
                url = `${baseUrl}/update_case/${args.case_id}`;
                method = 'POST';
                body = { ...args };
                delete body.operation;
                delete body.case_id;
                break;
            case 'update_cases':
                url = `${baseUrl}/update_cases/${args.suite_id}`;
                method = 'POST';
                body = { ...args };
                delete body.operation;
                delete body.suite_id;
                break;
            case 'copy_cases':
                url = `${baseUrl}/copy_cases_to_section/${args.section_id}`;
                method = 'POST';
                body = { case_ids: args.case_ids };
                break;
            case 'move_cases':
                url = `${baseUrl}/move_cases_to_section/${args.section_id}`;
                method = 'POST';
                body = { suite_id: args.suite_id, case_ids: args.case_ids };
                break;
            case 'delete_case':
                url = `${baseUrl}/delete_case/${args.case_id}`;
                method = 'POST';
                body = { soft: args.soft ? 1 : 0 };
                break;
            case 'delete_cases':
                url = `${baseUrl}/delete_cases/${args.suite_id}`;
                method = 'POST';
                body = { case_ids: args.case_ids, soft: args.soft ? 1 : 0 };
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

            const responseText = await response.text();
            try {
                const data = JSON.parse(responseText);
                return JSON.stringify(data, null, 2);
            } catch (e) {
                // If not JSON, return the raw response text
                return responseText;
            }

          } catch (error) {
            return `Failed to perform operation ${args.operation}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
          }
    },
  });
}
