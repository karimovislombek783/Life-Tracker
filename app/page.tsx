"use client";

import dynamic from "next/dynamic";

const Tracker = dynamic(() => import("./tracker"), { ssr: false });

export default function Page() {
  return <Tracker />;
}
