package cmd

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/claytablet/claytablet/cli/api"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"github.com/zalando/go-keyring"
)

var (
	cfgFile  string
	client   *api.Client
)

var rootCmd = &cobra.Command{
	Use:   "claytablet",
	Short: "ClayTablet CLI — обмен буфером обмена из терминала",
	Long: `claytablet — ClayTablet из терминала

КОМНАТА:
  claytablet room                   текущая комната
  claytablet room <id>              переключиться
  claytablet new [id]               создать новую
  claytablet rooms                  список твоих комнат (нужен логин)

КОНТЕНТ:
  claytablet ls                     список записей
  claytablet ls --last 5            последние 5
  claytablet send "текст"           отправить текст
  cat file | claytablet send        отправить через пайп
  claytablet copy                   скопировать последнее в буфер
  claytablet show <id>              полный текст по ID
  claytablet rm <id>                удалить запись
  claytablet clear                  очистить комнату

СТРИМ:
  claytablet watch                  следить в реальном времени
  claytablet tui                    открыть интерактивную доску (TUI)

АККАУНТ:
  claytablet login                  войти через браузер
  claytablet logout                 выйти
  claytablet me                     кто я

ПЛАГИНЫ:
  claytablet plugin list                     список плагинов сервера
  claytablet plugin config <id>              конфиг плагина
  claytablet plugin config <id> --set '{}'   сохранить конфиг
  claytablet plugin call <id> <path>         вызвать эндпоинт плагина

КОНФИГ:
  claytablet config --server https://claytablet.online --room my-room`,
	PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
		// Не нужен клиент для config команды
		if cmd.Name() == "config" {
			return nil
		}

		server := viper.GetString("server")
		room := viper.GetString("room")
		if server == "" {
			return fmt.Errorf("сервер не задан. Запусти: claytablet config --server https://claytablet.online --room my-room")
		}
		if room == "" {
			return fmt.Errorf("комната не задана. Запусти: claytablet config --room my-room")
		}

		password := viper.GetString("password")
		if password == "" {
			if p, err := keyring.Get("claytablet", "password"); err == nil {
				password = p
			}
		}
		token := viper.GetString("token")
		if token == "" {
			if t, err := keyring.Get("claytablet", "token"); err == nil {
				token = t
			}
		}

		client = api.New(server, room, password, token)
		return nil
	},
}

func Execute() {
	if err := rootCmd.Execute(); err != nil {
		os.Exit(1)
	}
}

func init() {
	cobra.OnInitialize(initConfig)

	rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "конфиг файл (по умолчанию ~/.config/claytablet.toml)")
	rootCmd.PersistentFlags().String("server", "", "URL сервера (например, https://claytablet.online)")
	rootCmd.PersistentFlags().String("room", "", "ID комнаты")
	rootCmd.PersistentFlags().String("password", "", "пароль комнаты (если защищена)")
	rootCmd.PersistentFlags().String("token", "", "JWT токен для личных комнат")

	viper.BindPFlag("server", rootCmd.PersistentFlags().Lookup("server"))
	viper.BindPFlag("room", rootCmd.PersistentFlags().Lookup("room"))
	viper.BindPFlag("password", rootCmd.PersistentFlags().Lookup("password"))
	viper.BindPFlag("token", rootCmd.PersistentFlags().Lookup("token"))
}

func initConfig() {
	if cfgFile != "" {
		viper.SetConfigFile(cfgFile)
	} else {
		home, err := os.UserHomeDir()
		if err == nil {
			viper.AddConfigPath(filepath.Join(home, ".config"))
			viper.AddConfigPath(home)
		}
		viper.SetConfigName("claytablet")
		viper.SetConfigType("toml")
	}

	viper.SetEnvPrefix("CLAYTAB")
	viper.AutomaticEnv()

	viper.ReadInConfig()
}
