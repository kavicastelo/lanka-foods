import React from "react";

/**
 * Normalizes phone numbers and generates direct WhatsApp click-to-chat links.
 * Strips whitespace, dashes, plus signs to ensure proper international E.164-compatible wa.me format.
 */
export function getWhatsAppUrl(phone, defaultText = "") {
    if (!phone) return null;
    // Keep numbers only
    const digits = String(phone).replace(/[^0-9]/g, "");
    if (!digits || digits.length < 5) return null;
    return `https://wa.me/${digits}?text=${encodeURIComponent(defaultText)}`;
}

/**
 * WhatsApp SVG icon component.
 */
export function WhatsAppIcon({ className = "h-4 w-4" }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path d="M17.472 14.382c-.301-.15-1.78-.878-2.056-.978-.276-.1-.477-.15-.678.15-.2.301-.778.978-.954 1.179-.176.2-.351.226-.652.075-.301-.15-1.272-.469-2.423-1.496-.895-.799-1.5-1.786-1.676-2.087-.176-.301-.019-.464.132-.614.136-.135.301-.351.452-.527.15-.176.2-.301.301-.502.101-.2.05-.376-.025-.527-.075-.15-.678-1.634-.929-2.237-.245-.588-.493-.508-.678-.518-.176-.01-.376-.01-.577-.01s-.527.075-.803.376c-.276.301-1.054 1.029-1.054 2.509 0 1.48 1.079 2.909 1.23 3.11.15.2 2.124 3.243 5.145 4.549.719.311 1.28.497 1.718.636.722.23 1.379.197 1.899.12.579-.087 1.78-.728 2.031-1.431.251-.703.251-1.305.176-1.431-.076-.126-.277-.201-.578-.351zM12.05 21.785h-.002a9.78 9.78 0 01-4.992-1.369l-.358-.213-3.712.974.991-3.619-.233-.371A9.79 9.79 0 012.26 12.05c0-5.399 4.39-9.79 9.79-9.79 2.615 0 5.073 1.019 6.923 2.87 1.85 1.85 2.868 4.308 2.868 6.924 0 5.4-4.39 9.791-9.79 9.791zm0-17.785c-4.407 0-7.99 3.583-7.99 7.99 0 1.409.368 2.784 1.066 3.991l.164.285-.632 2.308 2.361-.619.276.164a7.97 7.97 0 004.148 1.159h.002c4.407 0 7.99-3.583 7.99-7.99 0-2.134-.831-4.14-2.34-5.649A7.94 7.94 0 0012.05 4z" />
        </svg>
    );
}
