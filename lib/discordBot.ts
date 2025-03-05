import { Client, GatewayIntentBits } from "discord.js";
import "dotenv/config";

// Create a new Discord bot client
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once("ready", () => {
  console.log(`Logged in as ${client.user?.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return; // Ignore bot messages

  if (message.content.toLowerCase() === "!test") {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}`);
      const data = await response.json();
      
      if (data.date) {
        message.reply(`Current date: ${data.date}`);
      } else {
        message.reply("Couldn't fetch the date.");
      }
    } catch (error) {
      console.error("Error fetching date:", error);
      message.reply("An error occurred while fetching the date.");
    }
  }
});

// Log in the bot
client.login(process.env.DISCORD_BOT_TOKEN);
