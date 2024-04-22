import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useState } from "react";
import logo from "./assets/logo-universal.png";
import { toast } from "sonner";
import axios from "axios";
import crypto from "crypto";

interface Message {
  payload: string;
}

interface CommunityMetadata {
  name: string;
  chatPublicKey: string;
  chatPrivateKey: string;
  contentTopic: string;
}

const SERVICE_ENDPOINT = "https://waku.whisperd.tech";
const PUBSUB_TOPIC = "waku/2/rs/1/0";
const TEST_CONTENT_TOPIC = "/my-app/2/chatroom-2/proto";

function App() {
  const [newMessageHash, setNewMessageHash] = useState(
    "Please enter your message below 👇"
  );
  const [newMessage, setNewMessage] = useState("");
  const [username, setUsername] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [community, setCommunity] = useState<CommunityMetadata>();
  const [joinedCommunities, setJoinedCommunities] = useState<
    CommunityMetadata[]
  >([]);
  const [communityName, setCommunityName] = useState("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateMessage = (e: any) => setNewMessage(e.target.value);

  useEffect(() => {
    console.log("in init effect");

    // EventsOn("newMessage", (msg: Message) => {
    //   setMessages((prev) => [msg, ...prev]);
    // });
    // EventsOn("isOnline", (isOnline: boolean) => {
    //   if (isOnline) {
    //     toast.success("You are online.");
    //   } else {
    //     toast.warning("You are offline.");
    //   }
    // });

    const name = GetUser();
    setUsername(name);

    const communities = localStorage.getItem("communities");
    if (communities) {
      const parsed = JSON.parse(communities);
      setJoinedCommunities(parsed);
    }

    const fetchData = async () => {
      try {
        const joinedContentTopics = [];
        const response = await axios.get(
          `${SERVICE_ENDPOINT}/store/v1/messages?contentTopics=${TEST_CONTENT_TOPIC}`
        );
        console.log("Data:", response.data);
        setMessages(response.data.messages);
        // Handle the received data as needed
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    const intervalId = setInterval(fetchData, 5000); // Trigger fetchData every 5 seconds

    // Cleanup function to clear interval when the component unmounts
    return () => clearInterval(intervalId);
  }, []);

  const CreateUser = async (name: string) => {
    console.log("creating user");
    localStorage.setItem("username", name);
    return name;
  };

  const GetUser = () => {
    const name = localStorage.getItem("username");
    return name || "";
  };

  const Send = async (content: string) => {
    console.log("sending message", content);
    const payload = {
      content: content,
      name: username,
      timestamp: Math.floor(Date.now() / 1000),
    };

    console.log("payload", payload);
    const bytes = btoa(JSON.stringify(payload));
    console.log("bytes", bytes);

    const message = {
      payload: bytes,
      contentTopic: TEST_CONTENT_TOPIC,
    };
    console.log("message", message);
    const response = await axios.post(
      `${SERVICE_ENDPOINT}/relay/v1/auto/messages`,
      JSON.stringify(message),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  };

  const sendMessage = async () => {
    if (!username || !newMessage) {
      toast.warning("Username or message is empty.");
      return;
    }
    try {
      let result = await Send(newMessage);
      console.log("result", result);
      setNewMessageHash(result);
      setNewMessage("");
    } catch (err) {
      toast.error(`Error happens: ${err}`);
    }
  };

  const createUser = async () => {
    try {
      const name = await CreateUser(usernameInput);
      setUsername(name);
      toast("User has been created.");
    } catch (err) {
      toast.error(`Error happens: ${err}`);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateCommunityName = (e: any) => setCommunityName(e.target.value);

  const createCommunity = (name: string) => {
    // Generate a chat keypair for community
    const chatKeypair = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    console.log("chatKeypair", chatKeypair);

    const contentTopic = crypto
      .createHash("sha256")
      .update(chatKeypair.publicKey)
      .digest("hex");
    console.log("contentTopic", contentTopic);

    const metadata: CommunityMetadata = {
      name: name,
      chatPublicKey: chatKeypair.publicKey,
      chatPrivateKey: chatKeypair.privateKey,
      contentTopic: contentTopic,
    };

    const communities = localStorage.getItem("communities");
    if (communities) {
      const parsed = JSON.parse(communities);
      parsed.push(metadata);
      localStorage.setItem("communities", JSON.stringify(parsed));
      setJoinedCommunities(parsed);
    } else {
      localStorage.setItem("communities", JSON.stringify([metadata]));
      setJoinedCommunities([metadata]);
    }

    setCommunity(metadata);

    return metadata;
  };

  const decodeMsg = (index: number, msg: Message) => {
    try {
      const formtMsg = JSON.parse(atob(msg.payload));

      return (
        <li key={index} className="mb-1">
          [{formatDate(formtMsg.timestamp)} {formtMsg.name}] says:{" "}
          {formtMsg.content}
        </li>
      );
    } catch (err) {
      console.log("decode message error", msg, err);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  return (
    <div className="flex flex-col gap-10 items-center justify-center h-screen">
      <img height={100} width={100} src={logo} alt="logo" />

      <div className="absolute right-16 top-6 flex flex-row gap-2 items-center">
        <Label className="">Hello, {username}</Label>
      </div>

      {!username && (
        <div className="flex w-full max-w-sm items-center space-x-2">
          <Input
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            placeholder="Enter your username"
            autoComplete="off"
            autoCorrect="off"
          />
          <Button className="w-32" onClick={createUser}>
            Create
          </Button>
        </div>
      )}

      {username && (
        <div className="flex flex-col gap-10 items-center">
          <div className="flex w-full max-w-sm items-center space-x-2">
            <Input
              value={newMessage}
              onChange={updateMessage}
              placeholder="Input your message"
              autoComplete="off"
              autoCorrect="off"
            />
            <Button className="w-32" onClick={sendMessage}>
              Send
            </Button>
          </div>

          <div>
            <h1 className="text-xl font-bold mb-2">Message History</h1>
            <ScrollArea className="h-[300px] w-[550px] rounded-md border p-4 bg-gray-100">
              <ul className="text-sm">
                {messages.map((msg, index) => decodeMsg(index, msg))}
              </ul>
            </ScrollArea>
          </div>

          <div>
            <h1 className="text-xl font-bold mb-2">Community</h1>
            <div className="flex items-center space-x-2">
              <Input
                className="w-[300px]"
                value={communityName}
                onChange={updateCommunityName}
                placeholder="Input the community name"
                autoComplete="off"
                autoCorrect="off"
              />
              <Button className="w-50" onClick={() => createCommunity}>
                Create Community
              </Button>
            </div>
            <div></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
