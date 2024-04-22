import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import axios from "axios";
import { Github, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import logo from "./assets/logo-universal.png";

interface Message {
  payload: string;
  contentTopic: string;
  timestamp: number;
}

interface CommunityMetadata {
  name: string;
  contentTopic: string;
}

const SERVICE_ENDPOINT = "https://waku.whisperd.tech";
const COMMUNITY_CONTENT_TOPIC_PREFIX = "/universal/1/community";

function App() {
  const [newMessage, setNewMessage] = useState("");
  const [username, setUsername] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [community, setCommunity] = useState<CommunityMetadata | undefined>(
    undefined
  );
  const [joinedCommunities, setJoinedCommunities] = useState<
    CommunityMetadata[]
  >([]);
  const [communityName, setCommunityName] = useState("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateMessage = (e: any) => setNewMessage(e.target.value);

  useEffect(() => {
    const name = GetUser();
    setUsername(name);

    const localCommunity = localStorage.getItem("community");
    console.log("current community", localCommunity);
    setCommunity(localCommunity ? JSON.parse(localCommunity) : undefined);

    const communities = localStorage.getItem("communities");
    if (communities) {
      const parsed = JSON.parse(communities);
      setJoinedCommunities(parsed);
      console.log("joined communities", parsed);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const joinedContentTopics = joinedCommunities
          .map(
            (c: CommunityMetadata) =>
              `${COMMUNITY_CONTENT_TOPIC_PREFIX}/${c.contentTopic}`
          )
          .join(",");

        console.log("joinedContentTopics", joinedContentTopics);
        const response = await axios.get(
          `${SERVICE_ENDPOINT}/store/v1/messages?contentTopics=${joinedContentTopics}`
        );
        console.log("Data:", response.data);
        setMessages(
          response.data.messages.sort(
            (a: Message, b: Message) => b.timestamp - a.timestamp
          )
        );
        // Handle the received data as needed
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    const intervalId = setInterval(fetchData, 5000); // Trigger fetchData every 5 seconds

    // Cleanup function to clear interval when the component unmounts
    return () => clearInterval(intervalId);
  }, [joinedCommunities]);

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
      contentTopic: `${COMMUNITY_CONTENT_TOPIC_PREFIX}/${
        community!.contentTopic
      }`,
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
    const metadata: CommunityMetadata = {
      name: name,
      contentTopic: name,
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
    localStorage.setItem("community", JSON.stringify(metadata));
    setCommunityName("");

    return metadata;
  };

  const deleteCommunity = (index: number) => () => {
    const communities = localStorage.getItem("communities");
    if (communities) {
      const parsed = JSON.parse(communities);
      parsed.splice(index, 1);
      localStorage.setItem("communities", JSON.stringify(parsed));
      setJoinedCommunities(parsed);
      console.log("delete community", parsed);
      setCommunity(undefined);
      localStorage.removeItem("community");
    }
  };

  const decodeMsg = (index: number, msg: Message) => {
    try {
      if (
        msg.contentTopic !==
        `${COMMUNITY_CONTENT_TOPIC_PREFIX}/${community?.contentTopic}`
      ) {
        return;
      }
      const formtMsg = JSON.parse(atob(msg.payload));

      return (
        <li key={index} className="mb-1">
          <div className="flex flex-row justify-between">
            <Label>
              <span
                className={
                  formtMsg.name == username ? "bg-green-200" : "bg-gray-300"
                }
              >
                {formtMsg.name}:
              </span>{" "}
              {formtMsg.content}
            </Label>
            <Label>{formatDate(formtMsg.timestamp)}</Label>
          </div>
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
    <div className="flex flex-row items-center justify-center gap-20">
      {username && (
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-bold mb-2">Community</h1>
          <ul>
            {joinedCommunities.map((item, index) => (
              <li
                key={index}
                onClick={() => setCommunity(joinedCommunities[index])}
              >
                <div className="flex flex-row items-center gap-1">
                  <Label
                    className={
                      item.name == community?.name ? "bg-green-200" : ""
                    }
                  >
                    {item.name}
                  </Label>
                  <X size={18} onClick={deleteCommunity(index)} />
                </div>
              </li>
            ))}
          </ul>
          <Input
            className="w-[200px]"
            value={communityName}
            onChange={updateCommunityName}
            placeholder="Input the community name"
            autoComplete="off"
            autoCorrect="off"
          />
          <Button
            className="w-50"
            onClick={() => createCommunity(communityName)}
          >
            Join Community
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-10 items-center justify-center h-screen">
        <img height={100} width={100} src={logo} alt="logo" />

        <div className="absolute right-36 top-16 flex flex-row gap-2 items-center">
          <Label className="text-md">Hello, {username}</Label>
        </div>

        <div className="absolute right-16 top-16 flex flex-row gap-2 items-center">
          <a href="https://github.com/threeproto/wachat-web" target="_blank">
            <Github />
          </a>
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

        {username && community && (
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
                <ul className="text-sm flex flex-col gap-1">
                  {messages.map((msg, index) => decodeMsg(index, msg))}
                </ul>
              </ScrollArea>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
