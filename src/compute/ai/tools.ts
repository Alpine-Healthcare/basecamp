import { actions } from "@alpinehealthcare/pdos";

export const getTools = () => {
  const tools = [];

  // Dynamically create tools for each action in the actions object
  for (const category in actions) {
    if (Object.prototype.hasOwnProperty.call(actions, category)) {
      const categoryActions = actions[category as keyof typeof actions];
      
      if (categoryActions && typeof categoryActions === 'object') {
        for (const actionName in categoryActions) {
          if (Object.prototype.hasOwnProperty.call(categoryActions, actionName)) {
            // Use type assertion to avoid TypeScript errors
            const actionFunction = (categoryActions as any)[actionName];
            
            // Skip if not a function
            if (typeof actionFunction !== 'function') continue;
            
            const toolName = `${category}_${actionName}`;
            
            tools.push({
              name: toolName,
              description: `Executes the ${actionName} function in the ${category} category`,
              input_schema: {
                type: "object",
                properties: actionFunction.parameters?.properties || {},
                // Only add additionalProperties if no specific properties defined
                ...((!actionFunction.parameters || Object.keys(actionFunction.parameters.properties || {}).length === 0) ? 
                  { additionalProperties: true } : 
                  { required: actionFunction.parameters.required || [] })
              }
            });
          }
        }
      }
    }
  }

  return tools;
}