import { 
  Client,
  GatewayIntentBits,
  ChannelType,
  TextChannel,
  MessageMentions
} from "discord.js";
import "dotenv/config";
import dotenv from "dotenv";
import { 
  storeQuote,
  getNthMostRecentQuoteByUser,
  deleteQuote
} from "../lib/db"; // Adjust path if needed

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

  // ------------------------------------------------------------------
  // !quote Command
  // ------------------------------------------------------------------
  if (message.content.startsWith("!quote")) {
    const args = message.content.split(" ").slice(1); // Extract arguments

    // Default values (assume !quote 1 0 if missing)
    const messagesUp = parseInt(args[0] || "1", 10);
    const ignoreBottom = parseInt(args[1] || "0", 10);

    // Validate input
    if (
      isNaN(messagesUp) || 
      isNaN(ignoreBottom) || 
      messagesUp <= 0 || 
      ignoreBottom < 0 || 
      ignoreBottom >= messagesUp
    ) {
      return message.reply(
        "Invalid format! Use: `!quote <messages_up> <ignore_bottom>` or `!quote` (defaults to 1 0)."
      );
    }

    try {
      // Fetch the last messages in the channel
      const fetchedMessages = await message.channel.messages.fetch({
        limit: messagesUp + 1, // +1 to exclude the command itself
      });
      // Convert to array (oldest -> newest)
      const messagesArray = Array.from(fetchedMessages.values()).reverse();

      // Remove the command message itself
      messagesArray.pop();

      // Validate we have enough messages
      if (messagesArray.length < messagesUp) {
        return message.reply("Not enough messages in this channel.");
      }

      // Exclude the bottom 'ignoreBottom' messages
      const relevantMessages = messagesArray.slice(0, messagesUp - ignoreBottom);

      if (relevantMessages.length === 0) {
        return message.reply("No valid messages left after filtering.");
      }

      // Get the original author of the first message in the range
      const originalAuthor = relevantMessages[0].author;

      // Filter out messages not sent by that same user
      const filteredMessages = relevantMessages.filter(
        (msg) => msg.author.id === originalAuthor.id
      );

      if (filteredMessages.length === 0) {
        return message.reply("No valid messages found from the same user.");
      }

      // Prevent mentions from being quoted
      const sanitizedMessages = filteredMessages.map((msg) => {
        return msg.content
          .replace(MessageMentions.UsersPattern, "[user]")
          .replace(MessageMentions.RolesPattern, "[role]")
          .replace(MessageMentions.EveryonePattern, "[everyone]");
      });

      // Format messages in quote style
      const quoteText = sanitizedMessages
        .map((msg) => `> "${msg}"`)
        .join("\n");

      // Add author attribution
      const quoteMessage = `${quoteText}\n- ${originalAuthor.username}`;

      // Find the youngest channel named "quotes" (case-insensitive)
      const channels = message.guild?.channels.cache.filter(
        (channel) =>
          channel.type === ChannelType.GuildText &&
          channel.name.toLowerCase() === "quotes"
      );
      const youngestQuotesChannel = channels
        ?.sort((a, b) => (b.createdTimestamp ?? 0) - (a.createdTimestamp ?? 0))
        .first() as TextChannel | undefined;

      if (!youngestQuotesChannel) {
        return message.reply("No channel named 'quotes' found.");
      }

      // Post the quote
      const sentMessage = await youngestQuotesChannel.send(quoteMessage);

      // Store the quote in DB
      await storeQuote(
        sentMessage.id,              // the message ID
        sanitizedMessages,           // lines of content
        originalAuthor.username,     // who wrote the original text
        message.author.username      // who used !quote
      );

      // Reply to the first quoted message with a link
      await filteredMessages[0].reply(
        `Your quote has been posted in #${youngestQuotesChannel.name}: [Jump to Quote](${sentMessage.url})`
      );
    } catch (error) {
      console.error("Error processing quote command:", error);
      message.reply("An error occurred while processing the quote.");
    }
  }

  // ------------------------------------------------------------------
  // !unquote Command
  // ------------------------------------------------------------------
  if (message.content.startsWith("!unquote")) {
    const args = message.content.split(" ").slice(1); // e.g., ["latest"] or ["2", etc.]

    let n = 1; // default: "latest"
    if (args[0] && args[0].toLowerCase() !== "latest") {
      const parsed = parseInt(args[0], 10);
      if (!isNaN(parsed) && parsed > 0) {
        n = parsed;
      } else {
        return message.reply(
          "Invalid usage! Try `!unquote latest` or `!unquote <number>`."
        );
      }
    }

    try {
      // Get the nth most recent quote by this user
      const quoteRow = await getNthMostRecentQuoteByUser(
        message.author.username,
        n
      );
      if (!quoteRow) {
        return message.reply("No quote found for you at that index.");
      }

      const { message_id: storedMessageId } = quoteRow;

      // Now we remove the quoted message from Discord by ID (unique across entire Discord)

      let foundAndDeleted = false;

      // We can attempt a "global" fetch on all text channels in this guild
      // Because discord.js doesn't provide a single method to fetch a message by ID alone,
      // we loop channels. This is typical unless we store channel_id in DB.
      if (message.guild) {
        for (const channel of message.guild.channels.cache.values()) {
          if (channel.type === ChannelType.GuildText) {
            const textChannel = channel as TextChannel;
            try {
              // Attempt to fetch the message in this channel
              const msgToDelete = await textChannel.messages.fetch(
                storedMessageId
              );
              // If found, delete it
              await msgToDelete.delete();
              foundAndDeleted = true;
              break;
            } catch (err) {
              // If we can't find it in this channel, it's fine. We'll keep searching.
            }
          }
        }
      }

      // Remove from DB
      await deleteQuote(storedMessageId);

      if (foundAndDeleted) {
        message.reply("Your quote has been removed from Discord and the database.");
      } else {
        message.reply(
          "Could not find the quote message in any channel, but the database entry was removed."
        );
      }
    } catch (err) {
      console.error("Error in !unquote command:", err);
      message.reply("An error occurred while trying to unquote.");
    }
  }
});

// Log in the bot
client.login(process.env.DISCORD_BOT_TOKEN);
