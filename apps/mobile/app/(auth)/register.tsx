import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { registerBodySchema } from "@buildtrust/shared";
import { Button, TextField } from "../../components";
import { apiClient, strings, useAuthStore } from "../../lib";

const registerFormSchema = registerBodySchema.extend({
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms to continue" }),
  }),
});
type RegisterFormValues = z.infer<typeof registerFormSchema>;

export default function Register() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { fullName: "", email: "", phone: "", password: "", termsAccepted: undefined },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setServerError(null);
    try {
      const { termsAccepted: _termsAccepted, ...body } = data;
      const { token, user } = await apiClient.auth.register(body);
      await setSession(token, user);
      router.replace("/(auth)/role");
    } catch {
      setServerError("Could not create your account. That email may already be registered.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        contentContainerClassName="flex-grow gap-6 px-6 py-10"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-3xl font-bold text-ink">{strings.register.title}</Text>

        <View className="gap-4">
          <Controller
            control={control}
            name="fullName"
            render={({ field }) => (
              <TextField
                label={strings.register.fullName}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.fullName?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <TextField
                label={strings.register.email}
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
            name="phone"
            render={({ field }) => (
              <TextField
                label={strings.register.phone}
                keyboardType="phone-pad"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.phone?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <TextField
                label={strings.register.password}
                secureToggle
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.password?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="termsAccepted"
            render={({ field }) => (
              <View>
                <Pressable
                  className="flex-row items-start gap-3"
                  onPress={() => field.onChange(!field.value)}
                >
                  <View
                    className={`mt-0.5 h-5 w-5 items-center justify-center rounded border ${
                      field.value ? "border-primary bg-primary" : "border-border bg-white"
                    }`}
                  >
                    {field.value ? <Text className="text-xs text-white">✓</Text> : null}
                  </View>
                  <Text className="flex-1 text-sm text-muted">{strings.register.terms}</Text>
                </Pressable>
                {errors.termsAccepted ? (
                  <Text className="mt-1 text-sm text-outgoing">{errors.termsAccepted.message}</Text>
                ) : null}
              </View>
            )}
          />

          {serverError ? <Text className="text-sm text-outgoing">{serverError}</Text> : null}
        </View>

        <Button
          label={strings.register.submit}
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
        />

        <View className="flex-row justify-center gap-1">
          <Text className="text-muted">{strings.register.loginPrompt}</Text>
          <Text className="font-medium text-accent" onPress={() => router.push("/(auth)/login")}>
            {strings.register.loginLink}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
