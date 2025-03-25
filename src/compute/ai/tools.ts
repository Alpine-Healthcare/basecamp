
export const getTools = () => {
  return [
    {
      "name": "get_records_for_today",
      "description": "Gets all health records for a given user for the current day and the specified metric",
      "input_schema": {
          "type": "object",
          "properties": {
              "metric": {
                  "type": "string",
                  "description": "The metric to get records for, e.g. weight, steps, etc."
              }
          },
          "required": ["metric"]
      }
    }
  ]
}