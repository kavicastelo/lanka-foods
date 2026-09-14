import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, User, Store } from "lucide-react";
import { useSendOrderMessage } from "@/hooks/useMarketplaceData";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Two-way in-app order communication component.
 * Used on OrderTracking page and RestaurantAdmin dashboard.
 */
export default function OrderChatBox({ order, currentRole = "customer", title = "Order Discussion & Chat" }) {
    const [text, setText] = useState("");
    const sendMutation = useSendOrderMessage();
    const messagesEndRef = useRef(null);

    const messages = order?.messages || [];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages.length]);

    const handleSend = (e) => {
        e.preventDefault();
        const trimmed = text.trim();
        if (!trimmed || sendMutation.isPending) return;

        sendMutation.mutate(
            { orderId: order.id, text: trimmed },
            {
                onSuccess: () => {
                    setText("");
                },
                onError: (err) => {
                    const error = /** @type {any} */ (err);
                    alert(error?.response?.data?.error?.message || error?.message || "Failed to send message.");
                },
            }
        );
    };

    return (
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-4 py-3">
                <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-700">{title}</h3>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-600 text-primary">
                        {messages.length} message{messages.length === 1 ? "" : "s"}
                    </span>
                </div>
                <div className="text-xs text-muted-foreground">
                    Direct conversation for Order #{order?.order_number || order?.orderNumber}
                </div>
            </div>

            {/* Message Thread */}
            <div className="max-h-72 min-h-48 overflow-y-auto p-4 space-y-3 bg-secondary/10">
                {messages.length === 0 ? (
                    <div className="grid place-items-center py-10 text-center text-xs text-muted-foreground">
                        <MessageSquare className="h-8 w-8 text-muted-foreground/40 mb-2" />
                        <p>No messages yet.</p>
                        <p className="mt-0.5">Send a message below to communicate directly about this order.</p>
                    </div>
                ) : (
                    messages.map((m, idx) => {
                        const isSelf =
                            (currentRole === "customer" && m.sender === "customer") ||
                            (currentRole !== "customer" && m.sender === "restaurant");

                        const time = m.sentAt ? new Date(m.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

                        return (
                            <div
                                key={m.id || idx}
                                className={cn("flex flex-col max-w-[85%]", isSelf ? "ml-auto items-end" : "mr-auto items-start")}
                            >
                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1 px-1">
                                    {m.sender === "restaurant" ? (
                                        <Store className="h-3 w-3 text-amber-600" />
                                    ) : (
                                        <User className="h-3 w-3 text-blue-600" />
                                    )}
                                    <span className="font-600">{m.senderName}</span>
                                    {time && <span>· {time}</span>}
                                </div>
                                <div
                                    className={cn(
                                        "rounded-2xl px-4 py-2 text-sm shadow-sm leading-relaxed",
                                        isSelf
                                            ? "bg-primary text-primary-foreground rounded-tr-none"
                                            : "bg-card border border-border text-foreground rounded-tl-none"
                                    )}
                                >
                                    {m.text}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border bg-card p-3">
                <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={currentRole === "customer" ? "Type a message to the restaurant..." : "Type a message to the customer..."}
                    className="flex-1 rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm outline-none focus:border-primary"
                    disabled={sendMutation.isPending}
                />
                <Button
                    type="submit"
                    size="sm"
                    className="rounded-xl px-4"
                    disabled={!text.trim() || sendMutation.isPending}
                >
                    <Send className="h-4 w-4 mr-1.5" />
                    {sendMutation.isPending ? "Sending..." : "Send"}
                </Button>
            </form>
        </div>
    );
}
