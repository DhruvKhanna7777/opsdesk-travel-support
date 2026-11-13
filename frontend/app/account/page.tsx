import { SupportPage } from "@/components/layout/support-page";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Spinner } from "@/components/ui/spinner";
import { AccountView } from "./_components/account-view";
import { ACCOUNT_VIEW_TEXT } from "@/lib/constants/text/account.text";

export const metadata: Metadata = {
  title: ACCOUNT_VIEW_TEXT.META_TITLE,
};

export default function AccountPage() {
  return (
    <SupportPage>
      <Suspense
        fallback={
          <div className="flex justify-center py-16">
            <Spinner label={ACCOUNT_VIEW_TEXT.LOADING} />
          </div>
        }
      >
        <AccountView />
      </Suspense>
    </SupportPage>
  );
}
