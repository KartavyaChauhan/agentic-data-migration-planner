import { GoogleGenAI } from '@google/genai';
import { sourceSchema, targetSchema, supportedTransformations } from './schemas';

export interface MappingProposal {
  mappings: {
    targetField: string;
    sourceFields: string[];
    transformation: string;
    description: string;
  }[];
  missingOrIncompatible: string[];
  risks: string[];
  clarificationQuestions: string[];
}

export async function generateMappingProposal(sampleData: any[]): Promise<MappingProposal> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    You are an expert Data Migration Architect.
    I need you to propose a field mapping and transformation plan to migrate data from a source schema to a target schema.
    
    Source Schema:
    ${JSON.stringify(sourceSchema, null, 2)}
    
    Target Schema:
    ${JSON.stringify(targetSchema, null, 2)}
    
    Supported Transformations:
    ${JSON.stringify(supportedTransformations, null, 2)}
    
    Sample Source Data (3 records):
    ${JSON.stringify(sampleData, null, 2)}
    
    Respond STRICTLY with a JSON object matching this TypeScript interface:
    {
      "mappings": [
        {
          "targetField": "string (the field name in targetSchema)",
          "sourceFields": ["string (field names from sourceSchema)"],
          "transformation": "string (the exact name of a supported transformation, or 'copy')",
          "description": "string (explanation of why this mapping and transformation was chosen)"
        }
      ],
      "missingOrIncompatible": ["string (explain any target fields that cannot be populated or source fields that are lost)"],
      "risks": ["string (explain data loss, truncation, or transformation risks)"],
      "clarificationQuestions": ["string (questions for the stakeholders)"]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    if (!response.text) {
        throw new Error('Failed to generate proposal (empty response)');
    }
    
    return JSON.parse(response.text) as MappingProposal;
  } catch (error) {
    console.error('Error calling Gemini:', error);
    throw error;
  }
}
