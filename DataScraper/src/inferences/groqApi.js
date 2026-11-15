import { Groq } from 'groq-sdk';

const groq = new Groq();

const chatCompletion = await groq.chat.completions.create({
    "messages": [
        {
            "role": "system",
            "content": "You classify events. For each event decide if it is a music event (concert, gig, festival with live music, DJ/club night, recital, open mic). Not music: theatre, stand-up, sports, conferences, exhibitions, workshops, unless music is the main attraction. Reply ONLY with JSON: {\\\"results\\\":[{\\\"id\\\":<int>,\\\"music\\\":<true|false>}]}"
        },
        {
            "role": "assistant",
            "content": ""
        },
        {
            "role": "user",
            "content": "Roger Waters Presents Legacy\\n============================\\n\\n[Sala Palatului](htvascript:void(0))..."
        },
        {
            "role": "assistant",
            "content": "{\"results\":[{\"id\":1,\"music\":true}]}"
        },
        {
            "role": "user",
            "content": ""
        }
    ],
    "model": "openai/gpt-oss-20b",
    "temperature": 1,
    "max_completion_tokens": 2048,
    "top_p": 1,
    "stream": true,
    "reasoning_effort": "medium",
    "stop": null
});

for await (const chunk of chatCompletion) {
    process.stdout.write(chunk.choices[0]?.delta?.content || '');
}

