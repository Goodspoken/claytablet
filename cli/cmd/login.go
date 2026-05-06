package cmd

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"strings"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var loginCmd = &cobra.Command{
	Use:   "login",
	Short: "Войти в аккаунт (Google / Yandex OAuth)",
	Long: `Открывает браузер для входа через Google или Yandex.
После входа скопируй токен из URL и вставь сюда.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		server := viper.GetString("server")
		if server == "" {
			server = "https://claytablet.online"
		}

		provider, _ := cmd.Flags().GetString("provider")

		loginURL := fmt.Sprintf("%s/api/auth/%s/login", server, provider)

		fmt.Printf("Открываю браузер для входа через %s...\n", strings.ToUpper(provider))
		fmt.Printf("URL: %s\n\n", loginURL)

		// Пытаемся открыть браузер автоматически
		opened := openBrowser(loginURL)
		if !opened {
			fmt.Println("Открой эту ссылку в браузере вручную.")
		}

		fmt.Printf("\nПосле входа открой настройки комнаты (⚙) на сайте —\nтам будет секция \"Токен для CLI\" с кнопкой копирования.\n\n")
		fmt.Print("Вставь токен: ")

		reader := bufio.NewReader(os.Stdin)
		token, err := reader.ReadString('\n')
		if err != nil {
			return fmt.Errorf("ошибка чтения: %w", err)
		}
		token = strings.TrimSpace(token)

		// Убираем префикс если пользователь вставил весь URL
		if idx := strings.Index(token, "?token="); idx != -1 {
			token = token[idx+7:]
		}
		if idx := strings.Index(token, "&"); idx != -1 {
			token = token[:idx]
		}

		if token == "" {
			return fmt.Errorf("токен не введён")
		}

		viper.Set("token", token)
		if err := viper.WriteConfig(); err != nil {
			// Если конфига ещё нет, создаём
			home, _ := os.UserHomeDir()
			viper.WriteConfigAs(home + "/.config/claytablet.toml")
		}

		fmt.Printf("\n✓ Токен сохранён в конфиге\n")
		fmt.Println("Теперь можешь смотреть свои комнаты: claytab rooms")
		return nil
	},
}

func openBrowser(url string) bool {
	var cmd string
	var args []string

	switch runtime.GOOS {
	case "linux":
		cmd = "xdg-open"
		args = []string{url}
	case "darwin":
		cmd = "open"
		args = []string{url}
	case "windows":
		cmd = "rundll32"
		args = []string{"url.dll,FileProtocolHandler", url}
	default:
		return false
	}

	err := exec.Command(cmd, args...).Start()
	return err == nil
}

func init() {
	loginCmd.Flags().StringP("provider", "p", "google", "провайдер: google или yandex")
	// login не требует room/server из PreRun
	loginCmd.PersistentPreRunE = func(cmd *cobra.Command, args []string) error { return nil }
	rootCmd.AddCommand(loginCmd)
}
