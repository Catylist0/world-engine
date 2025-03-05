import { Client, GatewayIntentBits, ChannelType, TextChannel, MessageMentions, User } from "discord.js";
import "dotenv/config";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" }); // Load .env.local manually

// Max messages to search to prevent lag in long channels
const MAX_SEARCH_DEPTH = 32;

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
    let targetUser: User | null = null;
    let messagesUp = 1;
    let ignoreBottom = 0;

    // Check if the first argument is a user mention
    if (args.length > 0 && message.mentions.users.size > 0) {
      targetUser = message.mentions.users.first() || null;
      args.shift(); // Remove the mention from the argument list
    }

    // Extract numbers, default to `1 0`
    messagesUp = parseInt(args[0] || "1", 10);
    ignoreBottom = parseInt(args[1] || "0", 10);

    // Validate numbers
    if (isNaN(messagesUp) || isNaN(ignoreBottom) || messagesUp <= 0 || ignoreBottom < 0 || ignoreBottom >= messagesUp) {
      return message.reply("Invalid format! Use: `!quote [@user] <messages_up> <ignore_bottom>` or `!quote` (defaults to 1 0).");
    }

    // Enforce search depth limit
    messagesUp = Math.min(messagesUp, MAX_SEARCH_DEPTH);

    try {
      // Fetch messages, limit capped at MAX_SEARCH_DEPTH
      const fetchedMessages = await message.channel.messages.fetch({ limit: MAX_SEARCH_DEPTH + 1 });
      const messagesArray = Array.from(fetchedMessages.values()).reverse(); // Convert to array (oldest -> newest)
      messagesArray.pop(); // Remove the command message itself

      // If targeting a specific user, filter messages by them
      let relevantMessages = messagesArray;
      if (targetUser) {
        relevantMessages = messagesArray.filter(msg => msg.author.id === targetUser?.id);
      }

      // Validate there are enough messages
      if (relevantMessages.length < messagesUp) {
        return message.reply("Not enough messages from this user.");
      }

      // Remove the bottom messages based on `ignoreBottom`
      const selectedMessages = relevantMessages.slice(0, messagesUp - ignoreBottom);

      // Ensure at least one message remains
      if (selectedMessages.length === 0) {
        return message.reply("No valid messages left after filtering.");
      }

      // Get the original author
      const originalAuthor = selectedMessages[0].author;

      // Prevent mentions from being quoted
      const sanitizedMessages = selectedMessages.map(msg =>
        msg.content
          .replace(MessageMentions.UsersPattern, "[user]")
          .replace(MessageMentions.RolesPattern, "[role]")
          .replace(MessageMentions.EveryonePattern, "[everyone]")
      );

      // Format messages in quote style
      const quoteText = sanitizedMessages.map(msg => `> "${msg}"`).join("\n");

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
      await selectedMessages[0].reply(`Your quote has been posted in #${youngestQuotesChannel.name}: [Jump to Quote](${sentMessage.url})`);

    } catch (error) {
      console.error("Error processing quote command:", error);
      message.reply("An error occurred while processing the quote.");
    }
  }
});

// Log in the bot
client.login(process.env.DISCORD_BOT_TOKEN);
