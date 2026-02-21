"use client";

import { useAuth } from "@/context/AuthContext";
import AddPostForm from "@/components/AddPostForm";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AddPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  if (loading || !user) {
    return <div className="flex items-center justify-center min-h-screen"><div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-24 pb-8 animate-fade-in">
      <AddPostForm />
    </div>
  );
}
