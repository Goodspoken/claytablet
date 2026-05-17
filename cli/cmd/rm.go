package cmd

import (
	"fmt"
	"strings"

	"github.com/spf13/cobra"
)

var rmCmd = &cobra.Command{
	Use:   "rm <номер или id>",
	Short: "Удалить запись из комнаты",
	Example: `  dubtab rm 3              # по порядковому номеру из ls
  dubtab rm a1b2c3d4       # по префиксу ID
  dubtab rm 3 --yes        # без подтверждения`,
	Args: cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		yes, _ := cmd.Flags().GetBool("yes")

		data, err := client.GetRoom(cmd.Context())
		if err != nil {
			return err
		}

		target, err := resolveRef(data, args[0])
		if err != nil {
			return err
		}

		if !yes {
			idShort := target.id
			if len(idShort) > 8 {
				idShort = idShort[:8]
			}
			preview := strings.ReplaceAll(target.content, "\n", "↵ ")
			if len([]rune(preview)) > 40 {
				preview = string([]rune(preview)[:37]) + "..."
			}
			fmt.Printf("Удалить %s [%s] %s? [y/N] ", strings.TrimSpace(target.kind), idShort, preview)
			var ans string
			fmt.Scanln(&ans)
			if strings.ToLower(ans) != "y" && strings.ToLower(ans) != "yes" {
				fmt.Println("Отменено.")
				return nil
			}
		}

		if err := client.DeleteItem(cmd.Context(), target.id); err != nil {
			return err
		}
		idShort := target.id
		if len(idShort) > 8 {
			idShort = idShort[:8]
		}
		fmt.Printf("✓ Удалено [%s]\n", idShort)
		return nil
	},
}

func init() {
	rmCmd.Flags().BoolP("yes", "y", false, "не спрашивать подтверждение")
	rootCmd.AddCommand(rmCmd)
}
