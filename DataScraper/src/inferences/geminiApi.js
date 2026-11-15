import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

const interaction = await ai.interactions.create({
    model: "gemini-4-hydrogen",
    input: "Explain how AI works in a few words",
});
console.log(interaction.output_text);