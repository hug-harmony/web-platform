"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MessageInterface: React.FC = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Vivamus odio dolor lobortis eget?",
      time: "10:45",
      sender: "user",
    },
    {
      id: 2,
      text: "Suspendisse ac consectetur enim accum",
      time: "10:47",
      sender: "other",
    },
    { id: 3, text: "Ut eget sapien eget enim", time: "10:48", sender: "user" },
    {
      id: 4,
      text: "Ullamcorper molestie, in at velit tortor",
      time: "10:50",
      sender: "other",
    },
    { id: 5, text: "Aliquam eu varius sapien?", time: "13:45", sender: "user" },
    {
      id: 6,
      text: "Audio message",
      time: "13:50",
      sender: "other",
      isAudio: true,
    },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (input.trim()) {
      const newMessage = {
        id: Date.now(),
        text: input,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        sender: "user",
      };
      setMessages([...messages, newMessage]);
      setInput("");
    }
  };

  return (
    <Card className="w-full  h-full flex flex-col">
      <CardHeader className="p-4 border-b">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white">
            GP
          </div>
          <div>
            <p className="font-semibold">Giles Posture</p>
            <p className="text-xs text-gray-500">Online</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-1 overflow-y-auto space-y-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`p-2 rounded-lg max-w-xs ${
                msg.sender === "user"
                  ? "bg-[#F5E6E8] text-black"
                  : "bg-[#D8A7B1] text-white"
              }`}
            >
              {msg.isAudio ? (
                <div className="flex items-center">
                  <span>🎵 Audio</span>
                </div>
              ) : (
                msg.text
              )}
              <div className="text-xs text-gray-500 mt-1">{msg.time}</div>
            </div>
          </div>
        ))}
        <div className="flex justify-end mt-2">
          <span className="text-xs text-gray-500">Giles is typing...</span>
        </div>
      </CardContent>
      <div className="p-4 border-t flex items-center">
        <Input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Write a message..."
          className="flex-1 mr-2"
        />
        <Button
          onClick={handleSend}
          className="bg-[#D8A7B1] hover:bg-[#C68E9C] text-white"
        >
          Send
        </Button>
      </div>
    </Card>
  );
};

export default MessageInterface;
