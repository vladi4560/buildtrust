import { useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginBodySchema, type LoginBody } from "@buildtrust/shared";
import { Button, TextField } from "../../components";
import { apiClient, strings, useAuthStore } from "../../lib";

export default function Login() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginBody>({
    resolver: zodResolver(loginBodySchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginBody) => {
    setServerError(null);
    try {
      const { token, user } = await apiClient.auth.login(data);
      await setSession(token, user);
      router.replace(user.role ? "/(tabs)/home" : "/(auth)/role");
    } catch {
      setServerError("Invalid email or password.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 gap-6 px-6 py-10">
        <Text className="text-3xl font-bold text-ink">{strings.login.title}</Text>

        <View className="gap-4">
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <TextField
                label={strings.login.email}
                autoCapitalize="none"
                keyboardType="email-address"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.email?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <TextField
                label={strings.login.password}
                secureToggle
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.password?.message}
              />
            )}
          />
          {serverError ? <Text className="text-sm text-outgoing">{serverError}</Text> : null}
        </View>

        <Button
          label={strings.login.submit}
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
        />

        <View className="flex-row justify-center gap-1">
          <Text className="text-muted">{strings.login.registerPrompt}</Text>
          <Text className="font-medium text-accent" onPress={() => router.push("/(auth)/register")}>
            {strings.login.registerLink}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
