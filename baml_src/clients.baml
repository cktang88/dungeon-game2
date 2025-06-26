// Gemini 2.5 Flash client for the dungeon game

client<llm> GeminiFlash {
  provider google-ai
  options {
    model "gemini-2.5-flash"
    api_key env.GOOGLE_API_KEY
    temperature 0.8
    max_output_tokens 8192
  }
}

// Retry policy for game requests
retry_policy GameRetry {
  max_retries 3
  strategy {
    type exponential_backoff
    delay_ms 2000
    multiplier 2
    max_delay_ms 10000
  }
}