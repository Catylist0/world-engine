import { Client, GatewayIntentBits } from "discord.js";
import "dotenv/config";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" }); // Load .env.local manually

//console.log("Loaded Bot Token:", process.env.DISCORD_BOT_TOKEN); // Debugging log


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
        const formattedDate = new Date(data.date).toLocaleString("en-US", { timeZone: "UTC" });
        message.reply(`Current date: ${formattedDate}`);
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
//console.log("Bot Token:", process.env.DISCORD_BOT_TOKEN);
client.login(process.env.DISCORD_BOT_TOKEN);
