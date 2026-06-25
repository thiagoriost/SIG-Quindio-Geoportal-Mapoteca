/**
   * Valida si el valor almacenado en localStorage bajo la clave especificada es `true`.
   *
   * Esta función intenta parsear el valor almacenado como JSON para obtener la propiedad `logger`.
   * Si el parseo falla (por ejemplo, si el valor no es un JSON válido), se asume que el valor es un string y se compara directamente con "true".
   * para activarlo debe almacenar en el localStorage un valor con la clave "logger" y el valor '{"logger": true}' o simplemente "true". ejemplo localStorage.setItem('logger', JSON.stringify({logger: true}))
   */
  export const validaLoggerLocalStorage = (key: string ): boolean => {
    let loggerParsed = null
    try {
      loggerParsed = JSON.parse(localStorage.getItem(key) || 'logger')?.logger
    } catch (e) {
      loggerParsed = localStorage.getItem(key)
    }
    return loggerParsed === true
  }