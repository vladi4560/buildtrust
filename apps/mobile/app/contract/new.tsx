import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Card, TextField } from "../../components";
import { useCreateContract, useProjects } from "../../features";

const milestoneSchema = z.object({
  title: z.string().min(1, "Required"),
  amountShekels: z.coerce.number().positive("Must be greater than 0"),
});

const formSchema = z
  .object({
    projectId: z.string().min(1, "Select a project"),
    amountShekels: z.coerce.number().positive("Enter an amount"),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
    estimatedEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
    workingDays: z.coerce.number().int().positive("Enter working days"),
    scope: z.string().min(1, "Describe the scope"),
    milestones: z.array(milestoneSchema).min(1, "Add at least one milestone"),
  })
  .refine(
    (data) => {
      const sum = data.milestones.reduce((total, m) => total + m.amountShekels, 0);
      return Math.abs(sum - data.amountShekels) < 0.01;
    },
    { message: "Milestone amounts must add up to the total amount", path: ["milestones"] },
  );
type FormValues = z.infer<typeof formSchema>;

export default function NewContract() {
  const { professionalId } = useLocalSearchParams<{ professionalId: string }>();
  const router = useRouter();
  const projectsQuery = useProjects();
  const createContract = useCreateContract();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectId: "",
      amountShekels: undefined,
      startDate: "",
      estimatedEnd: "",
      workingDays: undefined,
      scope: "",
      milestones: [{ title: "", amountShekels: undefined as unknown as number }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "milestones" });

  const onSubmit = async (values: FormValues) => {
    const contract = await createContract.mutateAsync({
      projectId: values.projectId,
      professionalId,
      amount: Math.round(values.amountShekels * 100),
      startDate: new Date(values.startDate),
      estimatedEnd: new Date(values.estimatedEnd),
      workingDays: values.workingDays,
      scope: values.scope,
      milestones: values.milestones.map((m) => ({
        title: m.title,
        amount: Math.round(m.amountShekels * 100),
      })),
    });
    router.replace(`/project/${contract.projectId}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerClassName="gap-6 px-6 py-6">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-ink">New Contract</Text>
          <Text className="text-sm font-medium text-muted" onPress={() => router.back()}>
            Cancel
          </Text>
        </View>

        <Controller
          control={control}
          name="projectId"
          render={({ field }) => (
            <View className="gap-2">
              <Text className="text-sm font-medium text-ink">Project</Text>
              {projectsQuery.data?.map((project) => (
                <Card
                  key={project.id}
                  selected={field.value === project.id}
                  onPress={() => field.onChange(project.id)}
                >
                  <Text className="text-sm font-medium text-ink">{project.title}</Text>
                </Card>
              ))}
              {errors.projectId ? (
                <Text className="text-sm text-outgoing">{errors.projectId.message}</Text>
              ) : null}
            </View>
          )}
        />

        <Controller
          control={control}
          name="amountShekels"
          render={({ field }) => (
            <TextField
              label="Total Amount (₪)"
              keyboardType="numeric"
              value={field.value === undefined ? "" : String(field.value)}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.amountShekels?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="startDate"
          render={({ field }) => (
            <TextField
              label="Start Date"
              placeholder="2026-08-10"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.startDate?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="estimatedEnd"
          render={({ field }) => (
            <TextField
              label="Estimated End"
              placeholder="2026-08-24"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.estimatedEnd?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="workingDays"
          render={({ field }) => (
            <TextField
              label="Working Days"
              keyboardType="numeric"
              value={field.value === undefined ? "" : String(field.value)}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.workingDays?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="scope"
          render={({ field }) => (
            <TextField
              label="Scope of Work"
              multiline
              numberOfLines={3}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.scope?.message}
            />
          )}
        />

        <View className="gap-3">
          <Text className="text-sm font-medium text-ink">Milestones</Text>
          {fields.map((item, index) => (
            <Card key={item.id}>
              <Controller
                control={control}
                name={`milestones.${index}.title`}
                render={({ field }) => (
                  <TextField
                    label={`Milestone ${index + 1}`}
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
              <View className="mt-3">
                <Controller
                  control={control}
                  name={`milestones.${index}.amountShekels`}
                  render={({ field }) => (
                    <TextField
                      label="Amount (₪)"
                      keyboardType="numeric"
                      value={field.value === undefined ? "" : String(field.value)}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
              </View>
              {fields.length > 1 ? (
                <Text
                  className="mt-3 text-sm font-medium text-outgoing"
                  onPress={() => remove(index)}
                >
                  Remove
                </Text>
              ) : null}
            </Card>
          ))}
          {errors.milestones?.message ? (
            <Text className="text-sm text-outgoing">{errors.milestones.message}</Text>
          ) : null}
          <Text
            className="text-sm font-medium text-accent"
            onPress={() => append({ title: "", amountShekels: undefined as unknown as number })}
          >
            + Add milestone
          </Text>
        </View>

        {createContract.isError ? (
          <Text className="text-sm text-outgoing">Could not create the contract. Try again.</Text>
        ) : null}

        <Button
          label="Send Contract"
          onPress={handleSubmit(onSubmit)}
          loading={createContract.isPending}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
