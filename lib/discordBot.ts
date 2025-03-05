import { Client, GatewayIntentBits, ChannelType, TextChannel } from "discord.js";
import "dotenv/config";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" }); // Load .env.local manually

// Create a new Discord bot client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user?.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return; // Ensure bot never responds to itself

  // Handle the !quote command
  if (message.content.startsWith("!quote")) {
    const args = message.content.split(" ").slice(1); // Extract arguments

    if (args.length !== 2 || isNaN(Number(args[0])) || isNaN(Number(args[1]))) {
      return message.reply("Invalid format! Use: `!quote <messages_up> <ignore_bottom>`");
    }

    const messagesUp = parseInt(args[0], 10);
    const ignoreBottom = parseInt(args[1], 10);

    if (messagesUp <= 0 || ignoreBottom < 0 || ignoreBottom >= messagesUp) {
      return message.reply("Invalid numbers! The first number must be greater than the second, and both must be non-negative.");
    }

    try {
      // Fetch the last messages in the channel
      const fetchedMessages = await message.channel.messages.fetch({ limit: messagesUp + 1 }); // +1 to exclude command itself
      const messagesArray = Array.from(fetchedMessages.values()).reverse(); // Convert to array (oldest -> newest)
      messagesArray.pop(); // Remove the command message itself

      // Validate there are enough messages
      if (messagesArray.length < messagesUp) {
        return message.reply("Not enough messages in this channel.");
      }

      // Remove the bottom messages based on `ignoreBottom`
      const relevantMessages = messagesArray.slice(0, messagesUp - ignoreBottom);

      // Ensure there's at least one valid message left
      if (relevantMessages.length === 0) {
        return message.reply("No valid messages left after filtering.");
      }

      // Get the original author of the first message in the range
      const originalAuthor = relevantMessages[0].author;

      // Filter out messages not sent by the original author
      const filteredMessages = relevantMessages.filter(msg => msg.author.id === originalAuthor.id);

      // Ensure at least one message remains after filtering
      if (filteredMessages.length === 0) {
        return message.reply("No valid messages found from the same user.");
      }

      // Format messages in quote style
      const quoteText = filteredMessages
        .map(msg => `> "${msg.content}"`)
        .join("\n");

      // Add author attribution
      const quoteMessage = `${quoteText}\n- ${originalAuthor.username}`;

      // Find the youngest channel named "quotes" (case insensitive)
      const channels = message.guild?.channels.cache.filter(
        channel => channel.type === ChannelType.GuildText && channel.name.toLowerCase() === "quotes"
      );

      const youngestQuotesChannel = channels
        ?.sort((a, b) => b.createdTimestamp - a.createdTimestamp)
        .first() as TextChannel | undefined;

      if (!youngestQuotesChannel) {
        return message.reply("No channel named 'quotes' found.");
      }

      // Send the quote to the "quotes" channel
      await youngestQuotesChannel.send(quoteMessage);

      message.reply(`Quote successfully posted in #${youngestQuotesChannel.name}.`);

    } catch (error) {
      console.error("Error processing quote command:", error);
      message.reply("An error occurred while processing the quote.");
    }
  }
});

// Log in the bot
client.login(process.env.DISCORD_BOT_TOKEN);
