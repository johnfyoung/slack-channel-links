const { WebClient } = require("@slack/web-api");
require("dotenv").config();
const fs = require("fs");

const token = process.env.SLACK_API_BEARER_TOKEN;

const web = new WebClient(token);

/**
 * This is code uses a Slack SDK for accessing the Slack API.
 *
 * It first requests the public slack channels in our workspace. From those channels,
 * the 04-resources channel is found. The channel.id is used to pull down all the messages in
 * the channel in tranches of 100 (as recommended by slack). If a message has attachments,
 * the links are written into a string. The strings are joined together and written to the
 * README.
 */
(async () => {
  const result = await web.conversations.list();

  if (result.ok) {
    const resourceChannel = result.channels.find(
      (channel) => channel.name === "04-resources"
    );

    if (resourceChannel) {
      let links = [];

      let historyResult = {};

      do {
        const options = {
          channel: resourceChannel.id,
          limit: 100,
        };

        if (historyResult?.response_metadata?.next_cursor) {
          options.cursor = historyResult.response_metadata.next_cursor.replace(
            "=",
            "%3D"
          );
        }

        console.log(options);

        historyResult = await web.conversations.history(options);

        if (historyResult.ok) {
          const linkMessages = historyResult.messages.filter((msg) =>
            msg.attachments ? true : false
          );

          const linkSet = linkMessages.map((msg) => {
            const sublinks = msg.attachments.map((attachment) => {
              if (!attachment.from_url.includes("slack.com")) {
                return `- [${
                  attachment.fallback
                    ? attachment.fallback
                    : attachment.title
                    ? attachment.title
                    : attachment.from_url
                }](${attachment.from_url}) - ${
                  attachment.text ? attachment.text : ""
                }`;
              } else {
                return "";
              }
            });
            return sublinks.join("  \n");
          });

          links = [...links, ...linkSet];
        } else {
          console.error("Problem getting the history", historyResult);
        }

        console.log(historyResult.response_metadata);
      } while (historyResult.response_metadata.next_cursor);

      const dateStr = getFormattedDate(new Date());

      fs.writeFileSync(
        "README.md",
        `# Slack Resources Channel Links (as of ${dateStr})\nThese are links pulled from the class \`04-resources\` channel.  \n\n${links.join(
          "  \n"
        )}`
      );
    } else {
      console.error("No resources channel");
    }
  } else {
    console.log("Problem getting the channels");
  }
})();

function getFormattedDate(date) {
  let year = date.getFullYear();
  let month = (1 + date.getMonth()).toString().padStart(2, "0");
  let day = date.getDate().toString().padStart(2, "0");

  return month + "/" + day + "/" + year;
}
