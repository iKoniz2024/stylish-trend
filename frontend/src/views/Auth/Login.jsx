"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from "react";

import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import Input from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { loginUser } from "@/services/auth.api";
import { useAuth } from "@/hooks/useAuth";
import useSettings from "@/hooks/useSettings";
import { Helmet } from "react-helmet-async";

import usePageTitle from "@/hooks/usePageTitle";

export default function Login({ children }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { fetchUser } = useAuth();
  const { siteName, logo } = useSettings();
  usePageTitle("Login");

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (formData) => {
    setLoading(true);

    try {
      await loginUser({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      const user = await fetchUser();

      if (user?.role === "admin") {
        toast.success("Login successful!");
        router.push("/dashboard");
      } else if (user?.role === "vendor") {
        const vendorStatus = user?.vendorInfo?.status;
        if (vendorStatus === "approved") {
          toast.success("Vendor login successful!");
          router.push("/dashboard/vendor");
        } else if (vendorStatus === "pending") {
          toast.error("Your seller application is pending admin approval.");
        } else if (vendorStatus === "suspended") {
          toast.error("Your seller account is suspended. Contact admin.");
        } else {
          toast.error("Your seller application was rejected.");
        }
      } else {
        toast.error("Invalid account role.");
      }
    } catch (err) {
      const validationErrors = err.response?.data?.errors;

      if (validationErrors) {
        validationErrors.forEach((error) => {
          setError(error.field, {
            type: "server",
            message: error.message,
          });
        });

        return;
      }

      toast.error(
        err.response?.data?.message ||
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Helmet>
        <title>{`Account Login | ${siteName}`}</title>
      </Helmet>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          {logo && <img src={logo} alt={siteName} className="mx-auto mb-4 h-20 w-auto dark:invert" />}
          <h1 className="text-2xl font-bold text-foreground">{siteName}</h1>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">Portal Login</CardTitle>
            <CardDescription>
              Sign in to access your Admin or Seller Dashboard
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Invalid email address",
                    },
                  })}
                  className={errors.email ? "border-destructive focus:border-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register("password", {
                    required: "Password is required",
                  })}
                  className={errors.password ? "border-destructive focus:border-destructive" : ""}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                className="btn-action-gold w-full rounded-full py-3 text-base shadow-md shrink-0"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
                    Signing in...
                  </div>
                ) : (
                  "Sign In"
                )}
              </button>

              <div className="pt-3 text-center text-xs text-muted-foreground">
                Want to sell on StylishTrend?{" "}
                <Link href="/become-seller" className="font-bold text-primary hover:underline">
                  Apply to Become a Seller
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
