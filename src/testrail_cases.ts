import { z } from "zod";
import { FastMCP } from "./FastMCP.js";

const testrailEnvSchema = z.object({
  TESTRAIL_URL: z.string().url("A valid TestRail URL is required."),
  TESTRAIL_USER: z.string().email("A valid TestRail user email is required."),
  TESTRAIL_API_KEY: z.string().min(1, "A TestRail API key is required."),
});

const env = testrailEnvSchema.parse(process.env);

export function addTestRailTools(server: FastMCP) {
  // --- fetch_testrail_case ---
const FetchTestCaseParams = z.object({
  case_id: z.number().int().positive("The numeric ID of the TestRail test case."),
});

server.addTool({
  name: "fetch_testrail_case",
  description: "Fetches the details of a specific test case from TestRail by its ID.",
  parameters: FetchTestCaseParams,
  annotations: {
    openWorldHint: true, // This tool interacts with an external system (TestRail)
    readOnlyHint: true, // This tool only reads data, it does not modify anything
  },
  execute: async (args) => {
    const { case_id } = args;
    const url = `${env.TESTRAIL_URL}/index.php?/api/v2/get_case/${case_id}`;

    // Create the Basic Auth header
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
      return JSON.stringify(data, null, 2); // Return the full case details as a formatted JSON string

    } catch (error) {
      console.error(error);
      // Return a user-friendly error message to the LLM
      return `Failed to fetch test case ${case_id}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
});

const GetCasesParams = z.object({
  project_id: z.number().int().positive("The ID of the project."),
  suite_id: z.number().int().positive().optional().describe("The ID of the test suite."),
  priority_id: z.string().optional().describe("A comma-separated list of priority IDs to filter by."),
  limit: z.number().int().positive().optional().describe("The number of test cases to return."),
  offset: z.number().int().nonnegative().optional().describe("The offset for pagination."),
  filter: z.string().optional().describe("A filter string to apply."),
});

server.addTool({
  name: "fetch_testrail_cases",
  description: "Fetches a list of test cases from TestRail for a given project, with optional filters.",
  parameters: GetCasesParams,
  annotations: {
    openWorldHint: true,
    readOnlyHint: true,
  },
  execute: async (args) => {
    const { project_id, ...filters } = args;
    let urlString = `${env.TESTRAIL_URL}/index.php?/api/v2/get_cases/${project_id}`;

    // Correctly construct the query string according to web standards
    const queryParams = [];
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined) {
        queryParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
      }
    }

    if (queryParams.length > 0) {
      // Use '?' for the first parameter and '&' for subsequent ones.
      // The TestRail URL already contains a '?', so we use '&'.
      urlString += '&' + queryParams.join('&');
    }

    console.log(`[TestRail Tool] Requesting URL: ${urlString}`);

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
      return `Failed to fetch test cases for project ${project_id}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
});

const GetCaseHistoryParams = z.object({
  case_id: z.number().int().positive("The ID of the test case to get history for."),
});

server.addTool({
  name: "fetch_testrail_case_history",
  description: "Fetches the edit history for a specific test case from TestRail.",
  parameters: GetCaseHistoryParams,
  annotations: {
    openWorldHint: true,
    readOnlyHint: true,
  },
  execute: async (args) => {
    const { case_id } = args;
    const url = `${env.TESTRAIL_URL}/index.php?/api/v2/get_history_for_case/${case_id}`;

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
      return `Failed to fetch history for test case ${case_id}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
});

const AddCaseParams = z.object({
  section_id: z.number().int().positive("The ID of the section (suite) to add the test case to."),
  title: z.string().min(1, "Test case title is required."),
  template_id: z.number().int().positive().optional().describe("The ID of the template (field layout, available in TestRail 4.0 and later)."),
  type_id: z.number().int().positive().optional().describe("The ID of the case type."),
  priority_id: z.number().int().positive().optional().describe("The ID of the case priority."),
  estimate: z.string().optional().describe("The estimate, e.g. '30s' or '1m 45s'."),
  milestone_id: z.number().int().positive().optional().describe("The ID of the milestone to link to the test case."),
  refs: z.string().optional().describe("A comma-separated list of references/requirements."),
  custom_steps: z.array(z.object({
    content: z.string().describe("The content/description of the step"),
    expected: z.string().optional().describe("The expected result of the step")
  })).optional().describe("An array of test steps (for step-by-step test cases)"),
  custom_preconds: z.string().optional().describe("The preconditions of the test case."),
  custom_expected: z.string().optional().describe("The expected result of the test case."),
  // Add any custom fields as needed
});

server.addTool({
  name: "add_testrail_case",
  description: "Adds a new test case to a TestRail project.",
  parameters: AddCaseParams,
  annotations: {
    openWorldHint: true,
    readOnlyHint: false, // This modifies data
  },
  execute: async (args) => {
    const { section_id, ...caseData } = args;
    const url = `${env.TESTRAIL_URL}/index.php?/api/v2/add_case/${section_id}`;

    // Create the Basic Auth header
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
        body: JSON.stringify(caseData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`TestRail API Error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      return JSON.stringify(data, null, 2);

    } catch (error) {
      console.error(error);
      return `Failed to add test case. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
});

const CopyCasesToSectionParams = z.object({
  section_id: z.number().int().positive("The ID of the destination section."),
  case_ids: z.array(z.number().int().positive()).min(1, "At least one case ID is required").describe("Array of test case IDs to copy")
});

server.addTool({
  name: "copy_cases_to_section",
  description: "Copies test cases to another section in TestRail.",
  parameters: CopyCasesToSectionParams,
  annotations: {
    openWorldHint: true,
    readOnlyHint: false, // This modifies data
  },
  execute: async (args) => {
    const { section_id, case_ids } = args;
    const url = `${env.TESTRAIL_URL}/index.php?/api/v2/copy_cases_to_section/${section_id}`;

    // Create the Basic Auth header
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
        body: JSON.stringify({
          case_ids
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`TestRail API Error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      // The TestRail API may return an empty body on a successful copy, which causes .json() to fail.
      // We'll read the response as text first to handle this case gracefully.
      const responseText = await response.text();
      if (responseText) {
        // If there's content, parse it and return it.
        const data = JSON.parse(responseText);
        return JSON.stringify(data, null, 2);
      }

      // If we are here, the response was successful but had no body.
      return `Successfully copied cases to section ${section_id}.`;

    } catch (error) {
      console.error(error);
      return `Failed to copy cases to section ${section_id}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
});

const UpdateCaseParams = z.object({
  case_id: z.number().int().positive("The ID of the test case to update."),
  title: z.string().optional(),
  template_id: z.number().int().positive().optional(),
  type_id: z.number().int().positive().optional(),
  priority_id: z.number().int().positive().optional(),
  estimate: z.string().optional(),
  milestone_id: z.number().int().positive().optional(),
  refs: z.string().optional(),
  custom_steps: z.array(z.object({
    content: z.string(),
    expected: z.string().optional()
  })).optional(),
  custom_preconds: z.string().optional(),
  custom_expected: z.string().optional(),
  // Add any additional custom fields as needed
});

server.addTool({
  name: "update_case",
  description: "Updates an existing test case in TestRail by its ID.",
  parameters: UpdateCaseParams,
  annotations: {
    openWorldHint: true,
    readOnlyHint: false, // This modifies data
  },
  execute: async (args) => {
    const { case_id, ...updateData } = args;
    const url = `${env.TESTRAIL_URL}/index.php?/api/v2/update_case/${case_id}`;

    // Create the Basic Auth header
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

      const responseText = await response.text();
      if (responseText) {
        const data = JSON.parse(responseText);
        return JSON.stringify(data, null, 2);
      }

      return `Successfully updated case ${case_id}.`;

    } catch (error) {
      console.error(error);
      return `Failed to update case ${case_id}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
});

const UpdateCasesParams = z.object({
  suite_id: z.number().int().positive("The ID of the test suite containing the cases."),
  case_ids: z.array(z.number().int().positive()).min(1, "An array of case IDs to be updated."),
  section_id: z.number().int().positive().optional().describe("The ID of the section the test cases should be updated to."),
  title: z.string().optional(),
  template_id: z.number().int().positive().optional(),
  type_id: z.number().int().positive().optional(),
  priority_id: z.number().int().positive().optional(),
  estimate: z.string().optional(),
  milestone_id: z.number().int().positive().optional(),
  refs: z.string().optional(),
});

server.addTool({
  name: "update_cases",
  description: `Updates multiple test cases with the same values, like setting a set of test cases to “High” priority. This does not support updating multiple test cases with different values per test case.`,
  parameters: UpdateCasesParams,
  annotations: {
    openWorldHint: true,
    readOnlyHint: false, // This modifies data
  },
  execute: async (args) => {
    const { suite_id, ...updateData } = args;
    const url = `${env.TESTRAIL_URL}/index.php?/api/v2/update_cases/${suite_id}`;

    // Create the Basic Auth header
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
        body: JSON.stringify(updateData) // Send the flat object with case_ids and other fields
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`TestRail API Error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const responseText = await response.text();
      if (responseText) {
        const data = JSON.parse(responseText);
        return JSON.stringify(data, null, 2);
      }

      return `Successfully updated cases in suite ${suite_id}.`;

    } catch (error) {
      console.error(error);
      return `Failed to update cases in suite ${suite_id}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
});

const MoveCasesToSectionParams = z.object({
  section_id: z.number().int().positive("The ID of the destination section."),
  suite_id: z.number().int().positive("The ID of the destination suite."),
  case_ids: z.array(z.number().int().positive()).min(1, "An array of case IDs to be moved."),
});

server.addTool({
  name: "move_cases_to_section",
  description: "Moves test cases to another section and/or suite.",
  parameters: MoveCasesToSectionParams,
  annotations: {
    openWorldHint: true,
    readOnlyHint: false, // This modifies data
  },
  execute: async (args) => {
    const { section_id, suite_id, case_ids } = args;
    const url = `${env.TESTRAIL_URL}/index.php?/api/v2/move_cases_to_section/${section_id}`;

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
        body: JSON.stringify({ suite_id, case_ids })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`TestRail API Error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const responseText = await response.text();
      if (responseText) {
        return responseText;
      }

      return `Successfully moved cases to section ${section_id} in suite ${suite_id}.`;

    } catch (error) {
      console.error(error);
      return `Failed to move cases. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
});

const DeleteCaseParams = z.object({
  case_id: z.number().int().positive("The ID of the test case to delete."),
  soft: z.boolean().optional().describe("Set to true for a soft delete to get info without deleting."),
});

server.addTool({
  name: "delete_case",
  description: "Deletes an existing test case.",
  parameters: DeleteCaseParams,
  annotations: {
    openWorldHint: true,
    readOnlyHint: false, // This is a destructive action
  },
  execute: async (args) => {
    const { case_id, soft } = args;
    const url = `${env.TESTRAIL_URL}/index.php?/api/v2/delete_case/${case_id}`;

    const authHeader = `Basic ${Buffer.from(
      `${env.TESTRAIL_USER}:${env.TESTRAIL_API_KEY}`
    ).toString("base64")}`;

    const body = soft ? { soft: 1 } : {};

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`TestRail API Error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const responseText = await response.text();
      if (responseText) {
        // A soft delete returns JSON, a hard delete may return nothing.
        return JSON.stringify(JSON.parse(responseText), null, 2);
      }

      return `Successfully deleted case ${case_id}.`;

    } catch (error) {
      // Handle cases where the response is empty and JSON.parse fails
      if (error instanceof SyntaxError && soft) {
        return `Soft delete simulation for case ${case_id} was successful, but no data was returned.`;
      } else if (error instanceof SyntaxError) {
         return `Successfully deleted case ${case_id}.`;
      }
      console.error(error);
      return `Failed to delete case ${case_id}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
});

const DeleteCasesParams = z.object({
  suite_id: z.number().int().positive("The ID of the test suite."),
  case_ids: z.array(z.number().int().positive()).min(1, "An array of case IDs to be deleted."),
  soft: z.boolean().optional().describe("Set to true for a soft delete to get info without deleting."),
});

server.addTool({
  name: "delete_cases",
  description: "Deletes multiple test cases from a test suite.",
  parameters: DeleteCasesParams,
  annotations: {
    openWorldHint: true,
    readOnlyHint: false, // This is a destructive action
  },
  execute: async (args) => {
    const { suite_id, case_ids, soft } = args;
    let url = `${env.TESTRAIL_URL}/index.php?/api/v2/delete_cases/${suite_id}`;
    if (soft) {
      url += '&soft=1';
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
        body: JSON.stringify({ case_ids }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`TestRail API Error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const responseText = await response.text();

      if (!soft) {
        return `Successfully deleted cases from suite ${suite_id}.`;
      }

      if (responseText) {
        try {
          const data = JSON.parse(responseText);
          return JSON.stringify(data, null, 2);
        } catch (e) {
          return `Soft delete for cases in suite ${suite_id} returned an invalid response: ${responseText}`;
        }
      }

      return `Soft delete for cases in suite ${suite_id} was successful but returned no data.`;

    } catch (error) {
      console.error(error);
      return `Failed to delete cases from suite ${suite_id}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
});

  console.log("All TestRail tools have been registered.");
}
