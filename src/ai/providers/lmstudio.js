// Файл для взаимодействия с LM Studio
const axios = require('axios');

export async function lmStudioChat(messages, model) {
    return axios.post("http://localhost:1234/v1/chat/completions", {
        model,
        messages
    });
}