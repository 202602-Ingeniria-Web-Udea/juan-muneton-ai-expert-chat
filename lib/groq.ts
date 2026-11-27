
import "server-only";
import Groq from "groq-sdk";

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
    throw new Error(
        "Falta configurar GROQ_API_KEY en las variables de entorno."
    );
}

export const groq = new Groq({
    apiKey,
});
