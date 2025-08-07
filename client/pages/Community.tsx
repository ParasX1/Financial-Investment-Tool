import React from "react";
import Sidebar from "@/components/sidebar"; // Update path if needed
import Image from "next/image";

const posts = [
  {
    user: "user A",
    title: "Far too many people are pursuing a career in finance",
    votes: 936,
    comments: 441,
    time: "1d ago",
  },
  {
    user: "user B",
    title: "Finance Bro Starterpack",
    votes: 354,
    comments: 49,
    time: "6y ago",
    image: "/assets/financebro.png", // put image in /public/assets/
  },
  {
    user: "user C",
    title: "Should have studied finance",
    votes: 8500,
    comments: 430,
    time: "4mo ago",
    image: "/assets/financefunny.png",
  },
  {
    user: "user D",
    title: "9 years into my finance career. How to make more money?",
    votes: 166,
    comments: 135,
    time: "1y ago",
  },
];

export default function Community() {
  return (
    <div className="flex bg-zinc-900 text-white min-h-screen">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 p-6">
        <h1 className="text-3xl font-bold mb-6">Community</h1>

        <div className="space-y-4">
          {posts.map((post, index) => (
            <div
              key={index}
              className="flex bg-zinc-800 rounded-lg overflow-hidden shadow hover:shadow-lg transition-shadow"
            >
              {/* Vote Sidebar */}
              <div className="bg-zinc-900 px-4 py-3 flex flex-col items-center justify-center text-gray-300 font-semibold">
                <span className="text-lg">{post.votes}</span>
                <span className="text-sm">votes</span>
              </div>

              {/* Post Body */}
              <div className="flex flex-col sm:flex-row justify-between w-full p-4">
                <div className="flex-1">
                  <p className="text-gray-400 text-sm mb-1">
                    Posted by {post.user} · {post.time}
                  </p>
                  <h2 className="text-xl font-semibold text-white">
                    {post.title}
                  </h2>
                  <p className="text-gray-400 mt-1 text-sm">
                    {post.comments} comments
                  </p>
                </div>

                {/* Optional Image */}
                {post.image && (
                  <div className="mt-4 sm:mt-0 sm:ml-4">
                    <Image
                      src={post.image}
                      alt="post image"
                      width={120}
                      height={80}
                      className="rounded-md"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

// import React from "react";
// import Sidebar from "@/components/sidebar"; // Adjust the path to match where Sidebar is located in your project

// function Community() {
//   return (
//     <div style={{ display: "flex" }}>
//       <Sidebar />
//       <div style={{ flex: 1, paddingLeft: "50px" }}>
//         {/* Your portfolio page content will go here */}
//         <h1>Community</h1>
//         <p>This is where you can add your community content.</p>
//       </div>
//     </div>
//   );
// }

// export default Community;

// import React from "react";
// import Sidebar from "@/components/sidebar"; // Adjust the path to match where Sidebar is located in your project

// function Community() {
//   return (
//     <div style={{ display: "flex" }}>
//       <Sidebar />
//       <div style={{ flex: 1, paddingLeft: "50px" }}>
//         {/* Your portfolio page content will go here */}
//         <h1>Community</h1>
//         <p>This is where you can add your community content.</p>
//       </div>
//     </div>
//   );
// }

// export default Community;
