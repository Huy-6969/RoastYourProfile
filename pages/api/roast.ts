import { NextApiRequest, NextApiResponse } from "next";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { ChatCompletionContentPart } from "openai/resources/index.mjs";

// The API handler function
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Extracting images from the request body
    const images: string[] = req.body.images;

    // Check if images are provided
    if (!images || images.length === 0) {
      res.status(400).json({ message: "No images provided" });
      return;
    }

    // Initialize OpenAI client
    const openai = new OpenAI();

    // Map images to chat completion content part format
    const imageMessages: ChatCompletionContentPart[] = images.map(
      (base64Image) => ({
        type: "image_url",
        image_url: {
          url: base64Image,
        },
      })
    );

    // Create a chat completion request to OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      stream: false,
      messages: [
        // User's prompt message
        {
          role: "user",
          content: [
            // Text content part with the roast description
            {
              type: "text",
              text: `Imagine your close friend is asking you to see their pic for tinder.
              Kindly roast them hard since they are not real so feel free to go all out.
               All while speaking plainly, as if to your very close friend. 
              IMPORTANT: Make sure your response is less than 60 words`,
            },
            // Image content parts
            ...imageMessages,
          ],
        },
      ],
      max_tokens: 300,
    });

    // Extracting the AI-generated message
    const aiMessage = response.choices[0].message.content;
    console.log("AI Message:", aiMessage);

    // Handling case where no AI message is returned
    if (!aiMessage) {
      return NextResponse.json({ success: false }, { status: 500 });
    }

    console.log("Generating audio...");
    // Generate speech from the AI message
    const roastMP3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "shimmer",
      input: aiMessage,
      response_format: "mp3",
    });

    console.log("Finished generating audio");

    // Convert response to buffer and send as MP3 file
    const roastMP3Buffer = Buffer.from(await roastMP3.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", 'attachment; filename="roast.mp3"');
    res.status(200).send(roastMP3Buffer);
  } catch (error) {
    // Error handling
    console.error("Error in generating audio:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}