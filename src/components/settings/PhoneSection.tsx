import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

const E164_REGEX = /^\+[1-9]\d{7,14}$/;

export default function PhoneSection() {
  const { toast } = useToast();
  const [phone, setPhone] = useState<string>("");

  useEffect(() => {
    const saved = localStorage.getItem("user_phone_e164") || "";
    setPhone(saved);
  }, []);

  const savePhone = () => {
    const trimmed = (phone || "").trim();
    if (!trimmed) {
      localStorage.removeItem("user_phone_e164");
      toast({
        title: "Phone removed",
        description: "Cleared saved phone number.",
      });
      return;
    }
    if (!E164_REGEX.test(trimmed)) {
      toast({
        title: "Invalid phone format",
        description: "Please include country code (E.164)",
        variant: "destructive",
      });
      return;
    }
    localStorage.setItem("user_phone_e164", trimmed);
    toast({ title: "Saved", description: "Phone number saved." });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Contact Phone</CardTitle>
        <CardDescription>
          Add a phone number (with country code) to share with your assistant
          workflows.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <div className="flex gap-2 items-center">
          <div className="flex-1">
            <PhoneInput
              id="phone"
              placeholder="Enter phone number"
              defaultCountry="US"
              value={phone || undefined}
              onChange={(val) => setPhone(val || "")}
              international
            />
          </div>
          <Button onClick={savePhone}>Save</Button>
        </div>
        {phone && !E164_REGEX.test(phone) && (
          <p className="text-xs text-red-600">
            Must include + and country code
          </p>
        )}
      </CardContent>
    </Card>
  );
}
