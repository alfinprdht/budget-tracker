import { LoginForm } from "@/components/LoginForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Budget Tracker</CardTitle>
        <CardDescription>Masuk untuk mengelola keuangan Anda</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm nextPath={next} />
      </CardContent>
    </Card>
  );
}
