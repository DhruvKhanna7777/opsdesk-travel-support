import { SupportPage } from "@/components/layout/support-page";
import { Suspense } from "react";
import { Skiper40Link } from "@/components/ui/skiper40-link";
import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { RegisterForm } from "./_components/register-form";
import { REGISTER_TEXT } from "@/lib/constants/text/auth.text";
import { ROUTES } from "@/lib/constants/routes.constants";

export const metadata: Metadata = {
  title: REGISTER_TEXT.META_TITLE,
};

export default function RegisterPage() {
  return (
    <SupportPage compact>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-text">{REGISTER_TEXT.HEADING}</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {REGISTER_TEXT.SUBHEADING}
          </p>
        </div>

        <Card>
          <Suspense fallback={null}>
            <RegisterForm />
          </Suspense>
        </Card>

        <p className="text-center text-sm text-text-secondary">
          {REGISTER_TEXT.HAVE_ACCOUNT_PROMPT}{" "}
          <Skiper40Link href={ROUTES.LOGIN} className="font-semibold text-text">
            {REGISTER_TEXT.LOG_IN_LINK}
          </Skiper40Link>
        </p>
      </div>
    </SupportPage>
  );
}
