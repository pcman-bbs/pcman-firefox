// Written by Ett Chung <ettoolong@hotmail.com>
// License: GPL v2

package
{
    import flash.display.Sprite;
    import flash.external.ExternalInterface;
    import flash.events.*;
    import flash.net.Socket;
    import flash.utils.ByteArray;
    import flash.system.Security;
    import flash.display.LoaderInfo;

    public class bbsfoxsocket extends Sprite
    {
        protected var socket:Socket;
        //protected var id:String;
        private var connect_cb:String       = null;
        private var disconnect_cb:String    = null;
        private var recieve_cb:String       = null;
        private var ioerror_cb:String       = null;
        private var securityerror_cb:String = null;
        private var iint_cb:String          = null;

        public function bbsfoxsocket():void {
            try {
                ExternalInterface.marshallExceptions = true;

                var keyStr:String;
                var valueStr:String;
                var paramObj:Object = LoaderInfo(this.root.loaderInfo).parameters;
                for (keyStr in paramObj) {
                    if(keyStr=="PolicyFile"){
                        valueStr = String(paramObj[keyStr]);
                        Security.loadPolicyFile(valueStr);
                    }
                    if(keyStr=="onloadcallback"){
                        valueStr = String(paramObj[keyStr]);
                        if(valueStr!="")
                            iint_cb = valueStr;
                    }
                }

                var url:String = root.loaderInfo.url;
                socket = new Socket();
                socket.addEventListener("close", onClose);
                socket.addEventListener("connect", onConnect);
                socket.addEventListener("ioError", onError);
                socket.addEventListener("securityError", onSecurityError);
                socket.addEventListener("socketData", onData);

                ExternalInterface.addCallback("convToUTF8", convToUTF8);
                ExternalInterface.addCallback("convFromUTF8", convFromUTF8);
                ExternalInterface.addCallback("connect", connect);
                ExternalInterface.addCallback("close", close);
                ExternalInterface.addCallback("write", write);
                ExternalInterface.addCallback("flush", flush);
                ExternalInterface.addCallback("setCallback", setCallback);
                if(iint_cb)
                    ExternalInterface.call(iint_cb);
            } catch (error:Error) {

            }
        }

        public function convToUTF8(v1:int, v2:int, charset:String):String{
            var result:String ="";
            var byte:ByteArray = new ByteArray();
            byte.writeByte(v1);
            byte.writeByte(v2);
            byte.position = 0;
            result = byte.readMultiByte(byte.length, charset);
            return result;
        }

        public function connect(host:String, port:int):void{
            try
            {
                socket.connect(host, port);
            }
            catch (err:IOErrorEvent)
            {
                onError(err);
            }
        }

        public function close():void{
            socket.close();
        }

        public function setCallback(callbackName:String, callbackStr:String):void{
            switch (callbackName)
            {
                case "connect" :       connect_cb = callbackStr;        break;
                case "disconnect" :    disconnect_cb = callbackStr;     break;
                case "recieve" :       recieve_cb = callbackStr;        break;
                case "ioerror" :       ioerror_cb = callbackStr;        break;
                case "securityerror" : securityerror_cb = callbackStr;  break;
            }
        }

        public function convFromUTF8(str:String, charset:String):Array{
            var result:String ="";
            var bytes:ByteArray = new ByteArray();
            bytes.writeMultiByte(str, charset);
            var array:Array = new Array();
            bytes.position = 0;
            while (bytes.bytesAvailable > 0)
                array.push(bytes.readByte());
            return array;
        }

        public function write(data:int):void{
            //socket.writeMultiByte(object, charSet);
            socket.writeByte(data);
        }

        public function flush():void{
            socket.flush();
        }

        protected function onConnect(event:Event):void{
            if(connect_cb)
                ExternalInterface.call(connect_cb);
        }

        protected function onError(event:IOErrorEvent):void{
            if(ioerror_cb)
                ExternalInterface.call(ioerror_cb, event.toString());
        }

        protected function onSecurityError(event:SecurityErrorEvent):void{
            if(securityerror_cb)
                ExternalInterface.call(securityerror_cb, event.toString());
        }

        protected function onClose(event:Event):void{
            socket.close();
            if(disconnect_cb)
                ExternalInterface.call(disconnect_cb);
        }

        protected function onData(event:ProgressEvent):void{
            var bytes:ByteArray = new ByteArray();
            socket.readBytes(bytes, 0, event.bytesLoaded);
            var array:Array = new Array();
            bytes.position = 0;
            while (bytes.bytesAvailable > 0)
                array.push(bytes.readByte());
            if(recieve_cb)
                ExternalInterface.call(recieve_cb, array);
        }
    }
}
