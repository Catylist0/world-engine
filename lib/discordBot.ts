import { Client, GatewayIntentBits, ChannelType, TextChannel, MessageMentions } from "discord.js";
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

    // Set default values (assume !quote 1 0 if arguments are missing)
    const messagesUp = parseInt(args[0] || "1", 10);
    const ignoreBottom = parseInt(args[1] || "0", 10);

    // Validate input
    if (isNaN(messagesUp) || isNaN(ignoreBottom) || messagesUp <= 0 || ignoreBottom < 0 || ignoreBottom >= messagesUp) {
      return message.reply("Invalid format! Use: `!quote <messages_up> <ignore_bottom>` or `!quote` (defaults to 1 0).");
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

      // Prevent mentions from being quoted
      const sanitizedMessages = filteredMessages.map(msg => {
        return msg.content.replace(MessageMentions.UsersPattern, "[user]")
                          .replace(MessageMentions.RolesPattern, "[role]")
                          .replace(MessageMentions.EveryonePattern, "[everyone]");
      });

      // Format messages in quote style
      const quoteText = sanitizedMessages
        .map(msg => `> "${msg}"`)
        .join("\n");

      // Add author attribution
      const quoteMessage = `${quoteText}\n- ${originalAuthor.username}`;

      // Find the youngest channel named "quotes" (case insensitive)
      const channels = message.guild?.channels.cache.filter(
        channel => channel.type === ChannelType.GuildText && channel.name.toLowerCase() === "quotes"
      );

      const youngestQuotesChannel = channels
        ?.sort((a, b) => (b.createdTimestamp ?? 0) - (a.createdTimestamp ?? 0))
        .first() as TextChannel | undefined;

      if (!youngestQuotesChannel) {
        return message.reply("No channel named 'quotes' found.");
      }

      // Send the quote to the "quotes" channel
      const sentMessage = await youngestQuotesChannel.send(quoteMessage);

      // Reply to the **top quoted message** with a link to the new quote
      await filteredMessages[0].reply(`Your quote has been posted in #${youngestQuotesChannel.name}: [Jump to Quote](${sentMessage.url})`);

    } catch (error) {
      console.error("Error processing quote command:", error);
      message.reply("An error occurred while processing the quote.");
    }
  }
});

// Log in the bot
client.login(process.env.DISCORD_BOT_TOKEN);
