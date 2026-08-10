import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateMeBodySchema, type UpdateMeBody } from "@buildtrust/shared";
import { Button, TextField } from "../../components";
import { useUpdateMe } from "../../features";
import { useAuthStore } from "../../lib";

export default function EditProfile() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const updateMe = useUpdateMe();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateMeBody>({
    resolver: zodResolver(updateMeBodySchema),
    defaultValues: {
      fullName: user?.fullName ?? "",
      phone: user?.phone ?? "",
      email: user?.email ?? "",
      location: user?.location ?? "",
      bio: user?.bio ?? "",
    },
  });

  const onSubmit = async (values: UpdateMeBody) => {
    await updateMe.mutateAsync(values);
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerClassName="gap-6 px-6 py-6">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-ink">Edit Profile</Text>
          <Text className="text-sm font-medium text-muted" onPress={() => router.back()}>
            Cancel
          </Text>
        </View>

        <View className="gap-4">
          <Controller
            control={control}
            name="fullName"
            render={({ field }) => (
              <TextField
                label="Full Name"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.fullName?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="phone"
            render={({ field }) => (
              <TextField
                label="Phone"
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
            name="email"
            render={({ field }) => (
              <TextField
                label="Email"
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
            name="location"
            render={({ field }) => (
              <TextField
                label="Location"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.location?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="bio"
            render={({ field }) => (
              <TextField
                label="Bio"
                multiline
                numberOfLines={4}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.bio?.message}
              />
            )}
          />

          {updateMe.isError ? (
            <Text className="text-sm text-outgoing">Could not save your changes. Try again.</Text>
          ) : null}
        </View>

        <Button
          label="Save Changes"
          onPress={handleSubmit(onSubmit)}
          loading={updateMe.isPending}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
