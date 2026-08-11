import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, TextField } from "../../components";
import { useCreateProject } from "../../features";

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  sizeLabel: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  budgetShekels: z.coerce.number().positive("Enter a budget greater than 0"),
});
type FormValues = z.infer<typeof formSchema>;

export default function NewProject() {
  const router = useRouter();
  const createProject = useCreateProject();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", sizeLabel: "", description: "", budgetShekels: undefined },
  });

  const onSubmit = async (values: FormValues) => {
    await createProject.mutateAsync({
      title: values.title,
      sizeLabel: values.sizeLabel || undefined,
      description: values.description || undefined,
      budgetPlanned: Math.round(values.budgetShekels * 100),
    });
    router.replace("/(tabs)/home");
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 gap-6 px-6 py-6">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-ink">New Project</Text>
          <Text className="text-sm font-medium text-muted" onPress={() => router.back()}>
            Cancel
          </Text>
        </View>

        <View className="gap-4">
          <Controller
            control={control}
            name="title"
            render={({ field }) => (
              <TextField
                label="Title"
                placeholder="Kitchen Renovation"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.title?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="sizeLabel"
            render={({ field }) => (
              <TextField
                label="Size (optional)"
                placeholder="Kitchen (15m²)"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
          <Controller
            control={control}
            name="description"
            render={({ field }) => (
              <TextField
                label="Description (optional)"
                multiline
                numberOfLines={3}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
          <Controller
            control={control}
            name="budgetShekels"
            render={({ field }) => (
              <TextField
                label="Budget (₪)"
                placeholder="15000"
                keyboardType="numeric"
                value={field.value === undefined ? "" : String(field.value)}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.budgetShekels?.message}
              />
            )}
          />
          {createProject.isError ? (
            <Text className="text-sm text-outgoing">Could not create the project. Try again.</Text>
          ) : null}
        </View>

        <Button
          label="Create Project"
          onPress={handleSubmit(onSubmit)}
          loading={createProject.isPending}
        />
      </View>
    </SafeAreaView>
  );
}
