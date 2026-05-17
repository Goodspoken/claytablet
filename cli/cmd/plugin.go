package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"text/tabwriter"

	"github.com/spf13/cobra"
)

var pluginCmd = &cobra.Command{
	Use:   "plugin",
	Short: "Управление плагинами сервера",
	Long: `Управление плагинами DubTab на сервере.

ИСПОЛЬЗОВАНИЕ:
  dubtab plugin list                     список всех плагинов
  dubtab plugin config <id>              показать конфиг плагина
  dubtab plugin config <id> --set '{}'   сохранить конфиг (JSON)
  dubtab plugin call <id> <path>         вызвать эндпоинт плагина
  dubtab plugin call <id> <path> --method POST --body '{}'

ПРИМЕРЫ:
  dubtab plugin list
  dubtab plugin config rss-fetcher
  dubtab plugin config rss-fetcher --set '{"feeds":[]}'
  dubtab plugin call rss-fetcher status
  dubtab plugin call rss-fetcher config --method POST --body '{"feeds":[]}'`,
}

// plugin list
var pluginListCmd = &cobra.Command{
	Use:   "list",
	Short: "Список установленных плагинов",
	RunE: func(cmd *cobra.Command, args []string) error {
		plugins, err := client.ListPlugins(cmd.Context())
		if err != nil {
			return err
		}

		if len(plugins) == 0 {
			fmt.Println("Плагины не установлены.")
			fmt.Println("Добавь папку плагина в plugins/ и перезапусти сервер.")
			return nil
		}

		w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
		fmt.Fprintln(w, "ID\tИМЯ\tВЕРСИЯ\tАВТОР\tСТАТУС")
		fmt.Fprintln(w, strings.Repeat("─", 60))
		for _, p := range plugins {
			status := p.Status
			if status == "loaded" {
				status = "✓ загружен"
			} else if strings.HasPrefix(status, "error") {
				status = "✗ " + status
			}
			fmt.Fprintf(w, "%s\t%s\t%s\t%s\t%s\n",
				p.ID, p.Name, p.Version, p.Author, status)
		}
		w.Flush()

		return nil
	},
}

// plugin config
var pluginConfigSetJSON string

var pluginConfigCmd = &cobra.Command{
	Use:   "config <plugin-id>",
	Short: "Показать или обновить конфиг плагина",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		pluginID := args[0]

		// --set → сохранить конфиг
		if pluginConfigSetJSON != "" {
			if err := client.SetPluginConfig(cmd.Context(), pluginID, json.RawMessage(pluginConfigSetJSON)); err != nil {
				return err
			}
			fmt.Printf("✓ Конфиг плагина %s сохранён\n", pluginID)
			return nil
		}

		// Иначе — показать текущий конфиг
		raw, err := client.GetPluginConfig(cmd.Context(), pluginID)
		if err != nil {
			return err
		}

		// Красивый вывод JSON
		var pretty interface{}
		if err := json.Unmarshal(raw, &pretty); err != nil {
			fmt.Println(string(raw))
			return nil
		}
		out, _ := json.MarshalIndent(pretty, "", "  ")
		fmt.Println(string(out))
		return nil
	},
}

// plugin call
var pluginCallMethod string
var pluginCallBody string

var pluginCallCmd = &cobra.Command{
	Use:   "call <plugin-id> <path>",
	Short: "Вызвать HTTP-эндпоинт плагина",
	Long: `Вызвать произвольный HTTP-эндпоинт зарегистрированного плагина.

Path — это часть URL после /api/plugins/{id}/.

ПРИМЕРЫ:
  dubtab plugin call rss-fetcher status
  dubtab plugin call rss-fetcher config
  dubtab plugin call rss-fetcher run --method POST --body '{"feed":"https://..."}'`,
	Args: cobra.ExactArgs(2),
	RunE: func(cmd *cobra.Command, args []string) error {
		pluginID := args[0]
		path := args[1]
		method := strings.ToUpper(pluginCallMethod)

		var body json.RawMessage
		if pluginCallBody != "" {
			body = json.RawMessage(pluginCallBody)
		}

		result, err := client.CallPlugin(cmd.Context(), pluginID, path, method, body)
		if err != nil {
			return err
		}

		// Pretty print
		var pretty interface{}
		if err := json.Unmarshal(result, &pretty); err != nil {
			fmt.Println(string(result))
			return nil
		}
		out, _ := json.MarshalIndent(pretty, "", "  ")
		fmt.Println(string(out))
		return nil
	},
}

func init() {
	// plugin config flags
	pluginConfigCmd.Flags().StringVar(&pluginConfigSetJSON, "set", "", "JSON для сохранения в конфиг плагина")

	// plugin call flags
	pluginCallCmd.Flags().StringVar(&pluginCallMethod, "method", "GET", "HTTP метод (GET, POST, DELETE)")
	pluginCallCmd.Flags().StringVar(&pluginCallBody, "body", "", "JSON body для POST-запроса")

	// subcommands
	pluginCmd.AddCommand(pluginListCmd)
	pluginCmd.AddCommand(pluginConfigCmd)
	pluginCmd.AddCommand(pluginCallCmd)

	rootCmd.AddCommand(pluginCmd)
}
