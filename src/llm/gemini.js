const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * Gemini-backed LLM client.
 *
 * This intentionally mirrors the existing `src/llm/openai.js` interface so the
 * rest of the project (agent + tool routing) can stay unchanged.
 */
class LLMClient {
  constructor() {
    this.model = process.env.GEMINI_MODEL || "gemini-3-flash-preview";

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Missing GEMINI_API_KEY in environment (.env). Add it before starting the server.",
      );
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  _convertOpenAIToolsToGeminiTools(tools) {
    // OpenAI tools shape (as used in this repo):
    // [
    //   { type: "function", function: { name, description, parameters } }
    // ]
    if (!Array.isArray(tools) || tools.length === 0) return undefined;

    const functionDeclarations = tools
      .filter(
        (t) => t && t.type === "function" && t.function && t.function.name,
      )
      .map((t) => ({
        name: t.function.name,
        description: t.function.description,
        // Gemini expects a JSON schema (OpenAPI-like). The OpenAI schema we
        // use in this project is already in the right format for parameters.
        parameters: t.function.parameters,
      }));

    if (functionDeclarations.length === 0) return undefined;
    return [{ functionDeclarations }];
  }

  async chat(messages, tools = null, toolChoice = "auto") {
    const systemInstruction = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");

    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const temperature = 0.1;
    let model;

    if (tools) {
      const geminiTools = this._convertOpenAIToolsToGeminiTools(tools);
      const functionCallingMode = toolChoice === "auto" ? "AUTO" : "ANY";

      model = this.genAI.getGenerativeModel({
        model: this.model,
        tools: geminiTools,
        toolConfig: {
          functionCallingConfig: { mode: functionCallingMode },
        },
      });
    } else {
      model = this.genAI.getGenerativeModel({ model: this.model });
    }

    const result = await model.generateContent({
      contents,
      systemInstruction,
      generationConfig: { temperature },
    });

    const enhanced = result.response;
    const functionCalls = enhanced.functionCalls?.();
    const text = enhanced.text ? enhanced.text() : "";

    if (functionCalls && functionCalls.length > 0) {
      // Match OpenAI shape expected by `src/agent.js`.
      return {
        message: {
          tool_calls: functionCalls.map((fc) => ({
            type: "function",
            function: {
              name: fc.name,
              arguments: JSON.stringify(fc.args ?? {}),
            },
          })),
          content: text,
        },
      };
    }

    return { message: { content: text } };
  }

  async generateGraphQL(prompt, context) {
    const messages = [
      {
        role: "system",
        content: `You are a PCDC GraphQL expert. Generate VALID GraphQL queries for the PCDC data model.
                
PCDC Schema Context:
${context}

Rules:
1. Always return valid GraphQL syntax
2. Use cohort { filterSet { ... } } structure
3. Support complex nested filters
4. Include proper diagnosis, demographics, and treatment filters
5. Return ONLY the GraphQL query in code block format`,
      },
      { role: "user", content: prompt },
    ];

    const response = await this.chat(messages);
    return response.message.content;
  }
}

module.exports = { LLMClient };
